FROM python:2.7

# Fix EOL Debian Buster
RUN echo "deb http://archive.debian.org/debian buster main" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security buster/updates main" >> /etc/apt/sources.list || true && \
    apt-get -o Acquire::Check-Valid-Until=false update && \
    apt-get install -y \
    libsodium-dev \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python-dev

WORKDIR /app

# Upgrade pip setuptools for legacy
RUN pip install "setuptools<45.0.0" "pip<21.0"
RUN pip install "zc.buildout==2.13.3"

# Copy repos
COPY openprocurement.api /app/openprocurement.api
COPY openprocurement.tender.core /app/openprocurement.tender.core
COPY openprocurement.tender.belowthreshold /app/openprocurement.tender.belowthreshold

# Install API deps
WORKDIR /app/openprocurement.api
RUN pip install -r requirements.txt
RUN pip install -e .

# Install Core
WORKDIR /app/openprocurement.tender.core
RUN pip install -e .

# Install BelowThreshold
WORKDIR /app/openprocurement.tender.belowthreshold
RUN pip install -e .

# Setup Config
WORKDIR /app/openprocurement.api
# Update config to point to couchdb container and define auth file
# Reset url just in case
RUN sed -i 's|http://.*:5984/|http://admin:password@couchdb:5984/|g' openprocurement.api.ini
# Ensure CouchDB DB name is set
# properties are handled by sed already if match found, but let's be safe
RUN echo "auth.file = auth.ini" >> openprocurement.api.ini

# Ensure auth.ini exists
RUN echo "[brokers]\nbroker = broker, broker\ntoken = token, token" > auth.ini

EXPOSE 6543

CMD ["pserve", "openprocurement.api.ini"]
