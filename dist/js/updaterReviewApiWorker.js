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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ1cGRhdGVyUmV2aWV3QXBpV29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInRoaXMub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xyXG5cdHZhciBjYWNoZVJldmlld3MgPSBlLmRhdGFbMF07XHJcblx0dmFyIGFwaVJldmlld3MgPSBlLmRhdGFbMV07XHJcblxyXG5cdGNhY2hlUmV2aWV3cy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcblx0XHR2YXIgaXNJbiA9IGZhbHNlO1xyXG5cdFx0Zm9yKHZhciBqID0gMDsgaiA8IGFwaVJldmlld3MubGVuZ3RoICYmIGlzSW4gPT09IGZhbHNlOyBqKyspe1xyXG5cdFx0XHRpZiAoSlNPTi5zdHJpbmdpZnkoZWxlbWVudCkgPT09IEpTT04uc3RyaW5naWZ5KGFwaVJldmlld3Nbal0pKXtcclxuXHRcdFx0XHRpc0luID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVx0XHJcblx0XHRpZiAoIWlzSW4pe1x0XHRcdFxyXG5cdFx0XHRmZXRjaChcImh0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzL1wiLFxyXG5cdFx0XHR7XHJcblx0XHRcdCAgICBoZWFkZXJzOiB7XHJcblx0XHRcdCAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXHJcblx0XHRcdCAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuXHRcdFx0ICAgIH0sXHJcblx0XHRcdCAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHQgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZWxlbWVudClcclxuXHRcdFx0fSlcclxuXHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzKXsgY29uc29sZS5sb2cocmVzKSB9KVxyXG5cdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzKXsgY29uc29sZS5sb2cocmVzKSB9KVxyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRjb25zb2xlLmxvZyhhcGlSZXZpZXdzKTtcclxuXHRjb25zb2xlLmxvZyhjYWNoZVJldmlld3MpO1xyXG59Il0sImZpbGUiOiJ1cGRhdGVyUmV2aWV3QXBpV29ya2VyLmpzIn0=
