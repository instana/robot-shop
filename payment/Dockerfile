FROM python:3.6

EXPOSE 8080

ENV AUTOWRAPT_BOOTSTRAP=flask

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt

COPY *.py /app/

CMD ["python", "payment.py"]
