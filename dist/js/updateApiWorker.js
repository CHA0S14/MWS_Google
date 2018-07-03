this.onmessage = function(e) {
	var cacheReviews = e.data[0];
	var apiReviews = e.data[1];

	cacheReviews.forEach((element) => {
		var isIn = false;
		for(var j = 0; j < apiReviews.length && isIn === false; j++){
			if (JSON.stringify(element) === JSON.stringify(apiReviews[j])){
				isIn = true;
			}
		}	
		if (!isIn){			
			fetch("http://localhost:1337/reviews/",
			{
			    headers: {
			      'Accept': 'application/json',
			      'Content-Type': 'application/json'
			    },
			    method: "POST",
			    body: JSON.stringify(element)
			})
			.then(function(res){ console.log(res) })
			.catch(function(res){ console.log(res) })
		}
	});

	console.log(apiReviews);
	console.log(cacheReviews);
}
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ1cGRhdGVBcGlXb3JrZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsidGhpcy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XHJcblx0dmFyIGNhY2hlUmV2aWV3cyA9IGUuZGF0YVswXTtcclxuXHR2YXIgYXBpUmV2aWV3cyA9IGUuZGF0YVsxXTtcclxuXHJcblx0Y2FjaGVSZXZpZXdzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuXHRcdHZhciBpc0luID0gZmFsc2U7XHJcblx0XHRmb3IodmFyIGogPSAwOyBqIDwgYXBpUmV2aWV3cy5sZW5ndGggJiYgaXNJbiA9PT0gZmFsc2U7IGorKyl7XHJcblx0XHRcdGlmIChKU09OLnN0cmluZ2lmeShlbGVtZW50KSA9PT0gSlNPTi5zdHJpbmdpZnkoYXBpUmV2aWV3c1tqXSkpe1xyXG5cdFx0XHRcdGlzSW4gPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHRcclxuXHRcdGlmICghaXNJbil7XHRcdFx0XHJcblx0XHRcdGZldGNoKFwiaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jldmlld3MvXCIsXHJcblx0XHRcdHtcclxuXHRcdFx0ICAgIGhlYWRlcnM6IHtcclxuXHRcdFx0ICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuXHRcdFx0ICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdFx0XHQgICAgfSxcclxuXHRcdFx0ICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdCAgICBib2R5OiBKU09OLnN0cmluZ2lmeShlbGVtZW50KVxyXG5cdFx0XHR9KVxyXG5cdFx0XHQudGhlbihmdW5jdGlvbihyZXMpeyBjb25zb2xlLmxvZyhyZXMpIH0pXHJcblx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXMpeyBjb25zb2xlLmxvZyhyZXMpIH0pXHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGNvbnNvbGUubG9nKGFwaVJldmlld3MpO1xyXG5cdGNvbnNvbGUubG9nKGNhY2hlUmV2aWV3cyk7XHJcbn0iXSwiZmlsZSI6InVwZGF0ZUFwaVdvcmtlci5qcyJ9
