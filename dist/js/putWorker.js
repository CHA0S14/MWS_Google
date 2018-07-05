this.onmessage = function(e) {
	fetch("http://localhost:1337/restaurants/" + e.data[0] + "?is_favorite=" + e.data[1]==="true",
	{
	    headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
	    },
	    method: "PUT"
	})
	.catch(function(res){ console.log(res) })
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJwdXRXb3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsidGhpcy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XHJcblx0ZmV0Y2goXCJodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHMvXCIgKyBlLmRhdGFbMF0gKyBcIj9pc19mYXZvcml0ZT1cIiArIGUuZGF0YVsxXT09PVwidHJ1ZVwiLFxyXG5cdHtcclxuXHQgICAgaGVhZGVyczoge1xyXG5cdCAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXHJcblx0ICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdCAgICB9LFxyXG5cdCAgICBtZXRob2Q6IFwiUFVUXCJcclxuXHR9KVxyXG5cdC5jYXRjaChmdW5jdGlvbihyZXMpeyBjb25zb2xlLmxvZyhyZXMpIH0pXHJcbn0iXSwiZmlsZSI6InB1dFdvcmtlci5qcyJ9
