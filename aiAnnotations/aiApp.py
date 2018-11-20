from flask import Flask, request
app = Flask(__name__)

@app.route('/', methods=['GET','POST'])
def hello_world():
	if request.method == 'POST':
		print(request.form)
		return "to-do"
	return 'Hello from Flask!'

if __name__ == '__main__':
  app.run()
