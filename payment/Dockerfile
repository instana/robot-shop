FROM python:3.6

EXPOSE 8080
USER root

#ENV AUTOWRAPT_BOOTSTRAP=flask
ENV INSTANA_SERVICE_NAME=Payment

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt

COPY *.py /app/
COPY payment.ini /app/

#CMD ["python", "payment.py"]
CMD ["uwsgi", "--ini", "payment.ini"]

