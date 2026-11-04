import json,base64,io,http.server
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        b=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        img=[c for c in b["messages"][1]["content"] if c["type"]=="image_url"][0]["image_url"]["url"]
        raw=base64.b64decode(img.split(",")[1])
        # crude: jpeg of red vs blue differ; use length parity of file bytes sum
        act="blowjob" if sum(raw[600:900])%2==0 else "doggy"
        txt="```json\n"+json.dumps({"act":act,"position":"kneeling","who_moves":"her","movement":"head bobs","correspondence":"upstrokes are her pulling back","confidence":0.9})+"\n```"
        out=json.dumps({"choices":[{"message":{"content":txt}}]}).encode()
        self.send_response(200);self.send_header("Content-Type","application/json");self.end_headers();self.wfile.write(out)
    def log_message(self,*a):pass
http.server.HTTPServer(("127.0.0.1",8799),H).serve_forever()
