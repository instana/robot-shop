FROM python:3

EXPOSE 8080

WORKDIR /app

COPY requirements.txt /app/

RUN pip install -r requirements.txt

COPY *.py /app/

CMD ["python", "payment.py"]
