from dotenv import load_dotenv
from flask import Blueprint, Flask

import doctor
import errors
import patient
from extensions import api, cors, jwt
from settings import Config

# from doctor.auth import init_doctor_db, register_doctor


def create_app(*args, **kwargs):
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(obj=Config)
    app.url_map.strict_slashes = False
    # Initialize doctor db
    # init_doctor_db()

    # Add default doctors if not exist
    # add_default_doctors()
    register_extensions(app)
    register_blueprints(app)

    return app


def register_extensions(app: Flask):
    cors.init_app(app)
    jwt.init_app(app)


def register_blueprints(app: Flask):
    origins = app.config.get("CORS_ORIGIN_WHITELIST")
    if not origins:
        raise ValueError(
            "Error: 'CORS_ORIGIN_WHITELIST' variable doesn't exist within configuration."
        )

    cors.init_app(app, origins=origins)

    api.add_namespace(patient.ns)
    api.add_namespace(doctor.ns)

    blueprint = Blueprint("api", __name__, url_prefix="/api/v1")

    api.init_app(blueprint)
    app.register_blueprint(blueprint)
    app.register_blueprint(errors.views.blueprint)


# def add_default_doctors():
#     """Add default doctors only once"""

#     default_doctors = [
#         ("doc1@example.com", "password123"),
#         ("doc2@example.com", "password123"),
#         ("doc3@example.com", "password123"),
#         ("doc4@example.com", "password123"),
#         ("doc5@example.com", "password123"),
#     ]

#     for email, pwd in default_doctors:
#         register_doctor(email, pwd)  # Will fail silently if already exists
