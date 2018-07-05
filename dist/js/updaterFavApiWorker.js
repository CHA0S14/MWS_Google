this.onmessage = function(e) {
	var cacheReviews = e.data[0];
	var apiReviews = e.data[1];

	cacheReviews.forEach((element) => {
		for(var j = 0; j < apiReviews.length; j++){
			if (element.id === apiReviews[j].id && element.is_favorite!==apiReviews[j].is_favorite){

				fetch("http://localhost:1337/restaurants/" + element.id + "?is_favorite=" + element.is_favorite,
				{
				    headers: {
				      'Accept': 'application/json',
				      'Content-Type': 'application/json'
				    },
				    method: "PUT"
				}).catch(function(res){ console.log(res) })

			}
		}	
	});

	console.log(apiReviews);
	console.log(cacheReviews);
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ1cGRhdGVyRmF2QXBpV29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xyXG5cdHZhciBjYWNoZVJldmlld3MgPSBlLmRhdGFbMF07XHJcblx0dmFyIGFwaVJldmlld3MgPSBlLmRhdGFbMV07XHJcblxyXG5cdGNhY2hlUmV2aWV3cy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcblx0XHRmb3IodmFyIGogPSAwOyBqIDwgYXBpUmV2aWV3cy5sZW5ndGg7IGorKyl7XHJcblx0XHRcdGlmIChlbGVtZW50LmlkID09PSBhcGlSZXZpZXdzW2pdLmlkICYmIGVsZW1lbnQuaXNfZmF2b3JpdGUhPT1hcGlSZXZpZXdzW2pdLmlzX2Zhdm9yaXRlKXtcclxuXHJcblx0XHRcdFx0ZmV0Y2goXCJodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHMvXCIgKyBlbGVtZW50LmlkICsgXCI/aXNfZmF2b3JpdGU9XCIgKyBlbGVtZW50LmlzX2Zhdm9yaXRlLFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHQgICAgaGVhZGVyczoge1xyXG5cdFx0XHRcdCAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXHJcblx0XHRcdFx0ICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdFx0XHRcdCAgICB9LFxyXG5cdFx0XHRcdCAgICBtZXRob2Q6IFwiUFVUXCJcclxuXHRcdFx0XHR9KS5jYXRjaChmdW5jdGlvbihyZXMpeyBjb25zb2xlLmxvZyhyZXMpIH0pXHJcblxyXG5cdFx0XHR9XHJcblx0XHR9XHRcclxuXHR9KTtcclxuXHJcblx0Y29uc29sZS5sb2coYXBpUmV2aWV3cyk7XHJcblx0Y29uc29sZS5sb2coY2FjaGVSZXZpZXdzKTtcclxufSJdLCJmaWxlIjoidXBkYXRlckZhdkFwaVdvcmtlci5qcyJ9
