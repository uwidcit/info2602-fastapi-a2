from app.models import Pokemon
import typer
import csv
from tabulate import tabulate
from sqlmodel import select
from app.database import create_db_and_tables, get_cli_session, drop_all
from app.models import *
from app.auth import encrypt_password
import subprocess
import platform
import os

cli = typer.Typer()

@cli.command()
def initialize():
    with get_cli_session() as db:
        print("I should implement the functionality of initializing the database")

@cli.command()
def test(base_url: str = "http://127.0.0.1:8000", headless: bool = True):
    try:
        subprocess.run(["npm", "install"], check=True, shell=platform.system() == "Windows")
    except subprocess.CalledProcessError:
        typer.secho("Installing test package failed. Install Node/npm on your PC to continue", fg=typer.colors.RED)
        raise typer.Exit(code=1)
        
    try:
        env = os.environ.copy()
        env["BASE_URL"] = base_url
        env["HEADLESS"] = str(headless).lower()
        subprocess.run(["npm", "test"], check=True, shell=platform.system() == "Windows", env=env)
    except subprocess.CalledProcessError:
        typer.secho("Tests failed!", fg=typer.colors.RED)
        raise typer.Exit(code=1)
   
if __name__ == "__main__":
    cli()