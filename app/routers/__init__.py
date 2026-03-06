import os 
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.utilities.flash import get_flashed_messages

main_router = APIRouter()
static_files = StaticFiles(directory=os.path.join(os.path.dirname(__file__),"..", "static"))
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__),"..", "templates"))
templates.env.globals['get_flashed_messages'] = get_flashed_messages


from .auth import auth_router
main_router.include_router(auth_router)

from .index import index_router
main_router.include_router(index_router)

from .app import app_router
main_router.include_router(app_router)
