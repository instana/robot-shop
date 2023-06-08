FROM python:3.9

EXPOSE 8080
USER root

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt
RUN opentelemetry-bootstrap -a install

COPY *.py /app/
COPY payment.ini /app/

#CMD ["python", "payment.py"]
CMD ["opentelemetry-instrument","uwsgi", "--ini", "payment.ini"]

