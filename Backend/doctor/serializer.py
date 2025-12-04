from flask_restx import fields

from . import ns

patient_details_model = ns.model(
    "PatientDetailsModel",
    {
        "name": fields.String(required=True),
        "picture": fields.String(required=True),
    },
)
