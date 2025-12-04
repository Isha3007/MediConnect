from typing import List, TypedDict
from pinecone import Pinecone, ServerlessSpec

from flask_restx import Resource
from langchain_pinecone import PineconeVectorStore
from vectorstore import index, embeddings, index_name
# oye, This below line is added for (user prompt + system prompt) style
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.chat_models import init_chat_model
# oye, StateGraph is the engine that builds our RAG workflow, Nodes (functions like retrieve, generate)Edges (which function runs next)
# How, state moves between them
from langgraph.graph import StateGraph, START, END
from flask_jwt_extended import get_jwt_identity, create_access_token, jwt_required
from extensions import CustomParser
from doctor.serializer import patient_details_model
from patient.views import data_mapping, otp_mapping
import shared.globals as globals

from extensions import CustomParser
from doctor.appointment import send_appointment_reminder
from .report_summarizer import summarize
from . import ns
from vectorstore import PINECONE_API_KEY, index, embeddings, index_name
from .auth import verify_doctor_login, register_doctor,get_doctor_id


llm = init_chat_model("llama-3.1-8b-instant", model_provider="groq")

class State(TypedDict, total=False):
    question: str
    context: list
    answer: str
    explanation: str
    supporting_sentences: list
    confidence: float


@ns.route("/ask")
class AskRoute(Resource):
    _ask_parser = CustomParser()
    _ask_parser.add_argument("question", type=str)

    @ns.expect(_ask_parser)
    @jwt_required()
    def post(self):
        email = get_jwt_identity()
        args = self._ask_parser.parse_args(strict=True)
        question = args.get("question")

        # store = data_mapping[email].files
        patient_id = email.split("@")[0].replace(".", "")

        store = PineconeVectorStore(
            index=index,
            embedding=embeddings,
            namespace=patient_id
        )

        # oye, similarity_search_with_score is used which searches pinecone db and 
        # find top 5 most relevant chunks based on embedding
        def retrieve(state):
            retrieved_docs = store.similarity_search_with_score(state["question"], k=5)
            return {
                "question": state["question"],  
                "context": retrieved_docs      
            }

        def generate(state):
            docs_content = "\n\n".join(doc.page_content for doc, _ in state["context"])

            system_prompt = """
        You are an evidence-based medical AI assistant. Your job is to answer QUESTIONS using ONLY the information in the CONTEXT.

        Your response MUST be VALID JSON with EXACTLY these keys:

        {
        "answer": "",
        "explanation": "",
        "supporting_sentences": [],
        "confidence": 0.0
        }

        Rules:
        - NO text outside the JSON.
        - Use ONLY the provided context. 
        - The "answer" must be written as a clear, natural sentence (not a direct quote).
        - If context is insufficient, answer:
        "Insufficient evidence to answer the question."        
        """

            user_prompt = f"""
        QUESTION:
        {state['question']}

        CONTEXT:
        {docs_content}

        Return ONLY the JSON.
        """

            # Call Groq Llama in CHAT FORMAT
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])

            # Extract content properly
            raw = getattr(response, "content", None)
            if raw is None:
                raw = response["message"]["content"]

            # oye, this line just print the result on terminal
            print("\n=== RAW MODEL OUTPUT ===\n", raw, "\n=======================\n")

            # oye this below code till the return block : parses llm-model output,
            # enable our XAI panel work consistently as it prevent pipeline crashes
            import json
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {
                    "answer": raw,
                    "explanation": "",
                    "supporting_sentences": [],
                    "confidence": 0.0
                }

            return {
                "question": state["question"],
                "context": state["context"] ,
                "answer": parsed.get("answer", ""),
                "explanation": parsed.get("explanation", ""),
                "supporting_sentences": parsed.get("supporting_sentences", []),
                "confidence": parsed.get("confidence", 0.0)
            }

        # oye, it creates langraph pipeline
        graph_builder = StateGraph(dict)

        # Register nodes by name
        graph_builder.add_node("retrieve", retrieve)
        graph_builder.add_node("generate", generate)

        # Wire them
        graph_builder.add_edge(START, "retrieve")
        graph_builder.add_edge("retrieve", "generate")
        graph_builder.add_edge("generate", END)

        # Compile graph
        graph = graph_builder.compile()

        # RUN GRAPH WITH INITIAL STATE
        result = graph.invoke({"question": question})

        # oye, it converts Pinecone chunks into a frontend-friendly structure
        evidence = []
        for doc, score in result["context"]:
            evidence.append({
                "text": doc.page_content,
                "score": float(score)
            })

        return {
            "answer": result["answer"],
            "explanation": result.get("explanation", ""),
            "supporting_sentences": result.get("supporting_sentences", []),
            "confidence": result.get("confidence", 0.0),
            "evidence": evidence
        }



@ns.route("/patient-details")
class PatientDetailsRoute(Resource):
    @ns.marshal_with(patient_details_model)
    @jwt_required()
    def post(self):
        email = get_jwt_identity()
        user_details = data_mapping[email]

        return user_details

@ns.route("/doctor-login")
class DoctorLoginRoute(Resource):
    _doctor_login_parser = CustomParser()
    _doctor_login_parser.add_argument("email", type=str, required=True)
    _doctor_login_parser.add_argument("password", type=str, required=True)

    @ns.expect(_doctor_login_parser)
    def post(self):
        args = self._doctor_login_parser.parse_args(strict=True)
        email = args.get("email")
        password = args.get("password")

        if not verify_doctor_login(email, password):
            return {"error": "Invalid credentials"}, 401

        doctor_id = get_doctor_id(email)
        print(f"Doctor ID {doctor_id} logged in successfully.")
        return {
            "message": "Login successful",
            "doctor_id": doctor_id
        }


@ns.route("/register-doctor")
class RegisterDoctorRoute(Resource):
    _reg_parser = CustomParser()
    _reg_parser.add_argument("email", type=str, required=True)
    _reg_parser.add_argument("password", type=str, required=True)

    @ns.expect(_reg_parser)
    def post(self):
        args = self._reg_parser.parse_args(strict=True)

        if register_doctor(args["email"], args["password"]):
            return {"message": "Doctor registered successfully"}

        return {"error": "Doctor already exists or DB error"}, 400

@ns.route("/verify-otp")
class VerifyOtpRoute(Resource):
    _verify_otp_parser = CustomParser()
    _verify_otp_parser.add_argument("otp", type=int)
    _verify_otp_parser.add_argument("doctor_id", type=int, required=True)


    @ns.expect(_verify_otp_parser)
    def post(self):
        args = self._verify_otp_parser.parse_args(strict=True)
        otp = args.get("otp")
        doctor_logged_in = args.get("doctor_id")
        print(f"Doctor ID attempting access: {doctor_logged_in}")
        if otp not in otp_mapping:
            return ns.abort(400, "Error: Invalid OTP entered.")

        email= otp_mapping.pop(otp)
        print(f"OTP verifing for selected doctor: {globals.selected_doctor_id}")
        if doctor_logged_in != globals.selected_doctor_id:
            return ns.abort(403, "Error: This Doctor does not have access to patient records.")
        access_token = create_access_token(email)

        return {"access_token": access_token}


@ns.route("/summarize-report")
class SummarizeReportRoute(Resource):
    @jwt_required()
    def get(self):
        email = get_jwt_identity()
        patient_id = email.split("@")[0].replace(".", "")

        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(index_name)

        index_stats = index.describe_index_stats()
        all_ids = index_stats["namespaces"].get(patient_id, {}).get("vector_count", 0)

        if all_ids == 0:
            return {"message": "No documents found."}, 404

        query_result = index.query(
            vector=[0] * index_stats["dimension"],  # dummy vector
            namespace=patient_id,
            top_k=all_ids,
            include_metadata=True
        )

        documents = [match["metadata"]["text"] for match in query_result["matches"]]

        full_text = "\n\n".join(documents)

        summary = summarize(full_text)

        return {"summary": summary}

@ns.route("/appointment-reminder")
class AppointmentReminderRoute(Resource):
    _appointment_parser = CustomParser()
    _appointment_parser.add_argument("appointment_date", type=str, required=True)
    _appointment_parser.add_argument("timezone", type=str, required=False)
    _appointment_parser.add_argument("timezone_offset", type=int, required=False)

    @ns.expect(_appointment_parser)
    @jwt_required()
    def post(self):
        email = get_jwt_identity()
        args = self._appointment_parser.parse_args(strict=True)
        appointment_date = args.get("appointment_date")
        timezone = args.get("timezone")
        timezone_offset = args.get("timezone_offset")

        try:
            send_appointment_reminder(email, appointment_date, timezone, timezone_offset)
            return {
                "message": f"Appointment reminder email sent for {appointment_date}",
                "email": email,
                "date": appointment_date,
                "timezone": timezone or "Not specified"
            }, 200
        except Exception as e:
            return {
                "error": f"Failed to send appointment reminder: {str(e)}"
            }, 500