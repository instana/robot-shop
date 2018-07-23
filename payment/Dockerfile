FROM python:3.6
# Downgraded to Python 2 due to futures package clash
# Will update back to Python 3 once depency hell is fixed

EXPOSE 8080

ENV AUTOWRAPT_BOOTSTRAP=flask

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt

COPY *.py /app/

CMD ["python", "payment.py"]
