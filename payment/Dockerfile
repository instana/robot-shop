FROM python:3.9

EXPOSE 8080
USER root

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt

COPY *.py /app/
COPY payment.ini /app/
ENV OTEL_TRACES_SAMPLER=traceidratio
ENV OTEL_TRACES_SAMPLER_ARG=0.2

#CMD ["python", "payment.py"]
CMD ["uwsgi", "--ini", "payment.ini"]

