FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*

COPY ./pyproject.toml ./
COPY ./README.md ./
COPY ./app /app

RUN pip install -e .

WORKDIR /app

# TODO: i should probably optimize this for prod but rn it works for dev
ENTRYPOINT ["fastapi", "dev"]
