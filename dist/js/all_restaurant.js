/** 
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }
  static get REVIEW_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }

  static getRestaurantFromApi(url, callback) {
    var restaurantData = fetch(url)
      .then((response) => response.json())
      .then((response) => {

        if (DBHelper.db !== undefined) {
          var transaction = DBHelper.db.transaction(["restaurants"], "readwrite");
          var objectStore = transaction.objectStore("restaurants");

          if (Array.isArray(response)) {
            for (var i in response) {
              var request = objectStore.put(response[i]);
              request.onerror = () => {
                console.log("Couldnt be added")
              };
            }
          } else {
            var request = objectStore.put(response);
            request.onerror = () => {
              console.log("Couldnt be added")
            };
          }
        }

        callback(null, response);
      })
      .catch((e) => {
        const error = (`Request failed. ${e}`);
        callback(error, null);
      });
  }

  static getReviewsFromApi(url, callback) {
    var restaurantData = fetch(url)
      .then((response) => response.json())
      .then((response) => {

        if (DBHelper.db2 !== undefined) {
          var transaction = DBHelper.db2.transaction(["reviews"], "readwrite");
          var objectStore = transaction.objectStore("reviews");

          if (Array.isArray(response)) {
            for (var i in response) {
              delete response[i].id;
              var request = objectStore.put(response[i]);
              request.onerror = () => {
                console.log("Couldnt be added")
              };
            }
          } else {
            delete response.id;
            var request = objectStore.put(response);
            request.onerror = () => {
              console.log("Couldnt be added")
            };
          }
        }
        callback(null, response);
      })
      .catch((e) => {
        const error = (`Request failed. ${e}`);
        callback(error, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    var url = DBHelper.DATABASE_URL + `/${id}`;
    if (DBHelper.db !== undefined) {
      var transaction = DBHelper.db.transaction(["restaurants"]);
      var objectStore = transaction.objectStore("restaurants");
      var request = objectStore.get(parseInt(id));

      request.onsuccess = function(event) {

        if(request.result === undefined){
          callback("No restaurant found", null);
        }else{
          callback(null, request.result);
        }

      };

      request.onerror = function(event) {
      }
    }


    // Request to api to update indexedDB
    DBHelper.getRestaurantFromApi(url, callback);
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchReviewRestaurantById(id, callback) {

    var url = DBHelper.REVIEW_URL + `${id}`;
    if (DBHelper.db2 !== undefined) {
      var transaction = DBHelper.db2.transaction(["reviews"]);
      var index = transaction.objectStore("reviews").index("restaurant_id");
      var request = index.getAll(parseInt(id));

      request.onsuccess = function(event) {
        if(request.result === undefined){
          callback("No restaurant found", null);
          // Request to api to update indexedDB
          DBHelper.getFromApi(url, callback);
        }else{
          var cacheReviews = request.result;
          callback(null, request.result);

          // Request to api to update indexedDB
          DBHelper.getReviewsFromApi(url, (error, response) => {

            var worker = new Worker("./js/updaterReviewApiWorker.js");
            var message = [cacheReviews, response];

            worker.postMessage(message);

            if(!request.result)
              callback(error,response);
          });
        }

      };

      request.onerror = function(event) {
        // Request to api to update indexedDB
        DBHelper.getReviewsFromApi(url, callback);
      }
    }

  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}
let restaurant;
let reviews;
var map;
const MAX_TEXT_LENGTH = 400;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

  if (!window.indexedDB) {
    window.alert("Su navegador no soporta una versión estable de indexedDB. Tal y como las características no serán validas");

    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });

        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      }
    });
  }

  // dejamos abierta nuestra base de datos
  let request = window.indexedDB.open("restaurants-json", 1);

  request.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request.onsuccess = function(event) {
    DBHelper.db = request.result;

    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });

        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      }
    });

    DBHelper.db.onerror = function(event) {
      // Generic error handler for all errors targeted at this database's
      // requests!
      alert("Database error: " + event.target.errorCode);
    };
  };

  // Este evento solamente está implementado en navegadores recientes
  request.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Se crea un almacén para contener la información de nuestros cliente
    // Se usará "ssn" como clave ya que es garantizado que es única
    var objectStore = db.createObjectStore("restaurants", {
      keyPath: "id"
    });

    // Se crea un índice para buscar clientespor vecindario..
    objectStore.createIndex("neighborhood", "neighborhood", {
      unique: false
    });

    // Se crea un indice para buscar clientes por tipo de cocina
    objectStore.createIndex("cuisine_type", "cuisine_type", {
      unique: false
    });

    // Se crea un índice para buscar clientespor vecindario..
    objectStore.createIndex("neighborhood-cuisine_type", ["neighborhood", "cuisine_type"], {
      unique: false
    });
  };

  // dejamos abierta nuestra base de datos
  let request2 = window.indexedDB.open("reviews-json", 1);

  request2.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request2.onsuccess = function(event) {
    DBHelper.db2 = request2.result;

    fetchReviewsFromURL();

    DBHelper.db2.onerror = function(event) {
      // Generic error handler for all errors targeted at this database's
      // requests!
      alert("Database error: " + event.target.errorCode);
    };
  };

  // Este evento solamente está implementado en navegadores recientes
  request2.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Se crea un almacén para contener la información de nuestros cliente
    // Se usará "ssn" como clave ya que es garantizado que es única
    var objectStore = db.createObjectStore("reviews", {
      keyPath: ["restaurant_id", "name", "createdAt", "updatedAt"]
    });


    // Se crea un índice para buscar clientespor vecindario..
    objectStore.createIndex("restaurant_id", "restaurant_id", {
      unique: false
    });
  };

  const form = document.getElementById('review-form');
  form.addEventListener("click",function(e){
    e.preventDefault();

    var worker = new Worker("./js/postWorker.js");

    var username = document.getElementsByName('username')[0].value;
    document.getElementsByName('username')[0].value = null;

    var rating = document.getElementsByName('rating')[0].value;
    document.getElementsByName('rating')[0].value = null;

    var comment = document.getElementsByName('comment')[0].value;
    document.getElementsByName('comment')[0].value = null;


    var id = getParameterByName('id');
    var message = {"restaurant_id": parseInt(id), "name": username, "createdAt": Date.now(), "updatedAt": Date.now(), "rating": rating, "comments": comment };

    worker.postMessage(message);

    addReview(message);

  });
}

addReview = (message) => {

  const ul = document.getElementById('reviews-list');

  ul.appendChild(createReviewHTML(message));

  if (DBHelper.db2 !== undefined) {
    var transaction = DBHelper.db2.transaction(["reviews"], "readwrite");
    var objectStore = transaction.objectStore("reviews");

    var request = objectStore.put(message);
    request.onerror = () => {
      console.log("Couldnt be added")
    };
  
  }

}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  var id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

fetchReviewsFromURL = (callback) => {
  if (self.review) { // restaurant already fetched!
    callback(null, self.review);
    return;
  }
  var id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviewRestaurantById(id, (error, reviews) => {
        self.reviews = reviews;
        if (!reviews) {
          console.error(error);
          return;
        }
        // fill reviews
        fillReviewsHTML();
      });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + '\'s image showing some delicius ' + restaurant.cuisine_type + ' food coocked in ' + restaurant.neighborhood;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const divNameDate = document.createElement('div');
  divNameDate.setAttribute("class", "title-date-div flex-container");

  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.setAttribute("class", "review-title");
  divNameDate.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toUTCString();
  date.setAttribute("class", "review-date");
  divNameDate.appendChild(date);

  li.appendChild(divNameDate);

  const divRatingComments = document.createElement('div');
  divRatingComments.setAttribute("class", "rating-comment-div");

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute("class", "review-rating");
  divRatingComments.appendChild(rating);

  const commentDiv = document.createElement('div');
  if (review.comments.length > MAX_TEXT_LENGTH) {
    const snipetText = review.comments.substring(0, MAX_TEXT_LENGTH) + "...";
    const snipet = document.createElement('p');
    snipet.setAttribute("class", "review-snipet");
    snipet.innerHTML = snipetText;
    commentDiv.appendChild(snipet);
  }

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute("class", "review-text");
  if (review.comments.length > MAX_TEXT_LENGTH)
    comments.style.display = 'none';
  commentDiv.appendChild(comments);

  if (review.comments.length > MAX_TEXT_LENGTH) {
    const displayButton = document.createElement('button');
    displayButton.innerHTML = "See more...";
    displayButton.setAttribute("class", "display-button");
    displayButton.addEventListener("click", function() {
      if (this.innerHTML === "See more...") {
        this.innerHTML = "See less...";
        this.previousElementSibling.style.display = 'block';
        this.previousElementSibling.previousElementSibling.style.display = 'none';
      } else {
        this.innerHTML = "See more...";
        this.previousElementSibling.style.display = 'none';
        this.previousElementSibling.previousElementSibling.style.display = 'block';
      }
    });
    commentDiv.appendChild(displayButton);
  }

  divRatingComments.appendChild(commentDiv);

  li.appendChild(divRatingComments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
function registerSW() {    

    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            if (!navigator.serviceWorker.controller) {
                return;
            }

            if (reg.waiting) {
                updateReady(reg.waiting);
                return;
            }

            if (reg.installing) {
                trackInstalling(reg.installing);
                return;
            }

            reg.addEventListener('updatefound', function () {
                trackInstalling(reg.installing);
            });
        });

        var refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
        
    }
}

updateReady = function (worker) {
    worker.postMessage({ action: 'skipWaiting' });
};

trackInstalling = function (worker) {
    worker.addEventListener('statechange', function () {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX3Jlc3RhdXJhbnQuanMiLCJyZXN0YXVyYW50X2luZm8uanMiLCJzd1JlZ2lzdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbF9yZXN0YXVyYW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIFxyXG4gKiBDb21tb24gZGF0YWJhc2UgaGVscGVyIGZ1bmN0aW9ucy5cclxuICovXHJcbmNsYXNzIERCSGVscGVyIHtcclxuICAvKipcclxuICAgKiBEYXRhYmFzZSBVUkwuXHJcbiAgICogQ2hhbmdlIHRoaXMgdG8gcmVzdGF1cmFudHMuanNvbiBmaWxlIGxvY2F0aW9uIG9uIHlvdXIgc2VydmVyLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXQgREFUQUJBU0VfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jlc3RhdXJhbnRzYDtcclxuICB9XHJcbiAgc3RhdGljIGdldCBSRVZJRVdfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jldmlld3MvP3Jlc3RhdXJhbnRfaWQ9YDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBnZXRSZXN0YXVyYW50RnJvbUFwaSh1cmwsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcmVzdGF1cmFudERhdGEgPSBmZXRjaCh1cmwpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgICAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIik7XHJcblxyXG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UpKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChyZXNwb25zZVtpXSk7XHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZ2V0UmV2aWV3c0Zyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYjIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIyLnRyYW5zYWN0aW9uKFtcInJldmlld3NcIl0sIFwicmVhZHdyaXRlXCIpO1xyXG4gICAgICAgICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIHJlc3BvbnNlW2ldLmlkO1xyXG4gICAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlW2ldKTtcclxuICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWxldGUgcmVzcG9uc2UuaWQ7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhIHJlc3RhdXJhbnQgYnkgaXRzIElELlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHVybCA9IERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGAvJHtpZH1gO1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChwYXJzZUludChpZCkpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG5cclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICBEQkhlbHBlci5nZXRSZXN0YXVyYW50RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmV2aWV3UmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcblxyXG4gICAgdmFyIHVybCA9IERCSGVscGVyLlJFVklFV19VUkwgKyBgJHtpZH1gO1xyXG4gICAgaWYgKERCSGVscGVyLmRiMiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiMi50cmFuc2FjdGlvbihbXCJyZXZpZXdzXCJdKTtcclxuICAgICAgdmFyIGluZGV4ID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIpLmluZGV4KFwicmVzdGF1cmFudF9pZFwiKTtcclxuICAgICAgdmFyIHJlcXVlc3QgPSBpbmRleC5nZXRBbGwocGFyc2VJbnQoaWQpKTtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICAgIERCSGVscGVyLmdldEZyb21BcGkodXJsLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICB2YXIgY2FjaGVSZXZpZXdzID0gcmVxdWVzdC5yZXN1bHQ7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0LnJlc3VsdCk7XHJcblxyXG4gICAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgICAgREJIZWxwZXIuZ2V0UmV2aWV3c0Zyb21BcGkodXJsLCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgICAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcihcIi4vanMvdXBkYXRlclJldmlld0FwaVdvcmtlci5qc1wiKTtcclxuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBbY2FjaGVSZXZpZXdzLCByZXNwb25zZV07XHJcblxyXG4gICAgICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICBpZighcmVxdWVzdC5yZXN1bHQpXHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IscmVzcG9uc2UpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgIERCSGVscGVyLmdldFJldmlld3NGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBwYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgdXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAuL3Jlc3RhdXJhbnQuaHRtbD9pZD0ke3Jlc3RhdXJhbnQuaWR9YCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC9pbWcvJHtyZXN0YXVyYW50LnBob3RvZ3JhcGh9LmpwZ2ApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTWFwIG1hcmtlciBmb3IgYSByZXN0YXVyYW50LlxyXG4gICAqL1xyXG4gIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgY29uc3QgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgIHBvc2l0aW9uOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgdGl0bGU6IHJlc3RhdXJhbnQubmFtZSxcclxuICAgICAgdXJsOiBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpLFxyXG4gICAgICBtYXA6IG1hcCxcclxuICAgICAgYW5pbWF0aW9uOiBnb29nbGUubWFwcy5BbmltYXRpb24uRFJPUFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG4gIH1cclxuXHJcbn0iLCJsZXQgcmVzdGF1cmFudDtcclxubGV0IHJldmlld3M7XHJcbnZhciBtYXA7XHJcbmNvbnN0IE1BWF9URVhUX0xFTkdUSCA9IDQwMDtcclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcclxuXHJcbiAgdmFyIGluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93Lm1vekluZGV4ZWREQiB8fCB3aW5kb3cud2Via2l0SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQiB8fCB3aW5kb3cuc2hpbUluZGV4ZWREQjtcclxuXHJcbiAgaWYgKCF3aW5kb3cuaW5kZXhlZERCKSB7XHJcbiAgICB3aW5kb3cuYWxlcnQoXCJTdSBuYXZlZ2Fkb3Igbm8gc29wb3J0YSB1bmEgdmVyc2nDs24gZXN0YWJsZSBkZSBpbmRleGVkREIuIFRhbCB5IGNvbW8gbGFzIGNhcmFjdGVyw61zdGljYXMgbm8gc2Vyw6FuIHZhbGlkYXNcIik7XHJcblxyXG4gICAgZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCgoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XHJcbiAgICAgICAgICB6b29tOiAxNixcclxuICAgICAgICAgIGNlbnRlcjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgICAgICBzY3JvbGx3aGVlbDogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZmlsbEJyZWFkY3J1bWIoKTtcclxuICAgICAgICBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHNlbGYucmVzdGF1cmFudCwgc2VsZi5tYXApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGRlamFtb3MgYWJpZXJ0YSBudWVzdHJhIGJhc2UgZGUgZGF0b3NcclxuICBsZXQgcmVxdWVzdCA9IHdpbmRvdy5pbmRleGVkREIub3BlbihcInJlc3RhdXJhbnRzLWpzb25cIiwgMSk7XHJcblxyXG4gIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBhbGVydChcIldoeSBkaWRuJ3QgeW91IGFsbG93IG15IHdlYiBhcHAgdG8gdXNlIEluZGV4ZWREQj8hXCIpO1xyXG4gIH07XHJcbiAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgREJIZWxwZXIuZGIgPSByZXF1ZXN0LnJlc3VsdDtcclxuXHJcbiAgICBmZXRjaFJlc3RhdXJhbnRGcm9tVVJMKChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgICAgICAgIHpvb206IDE2LFxyXG4gICAgICAgICAgY2VudGVyOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmaWxsQnJlYWRjcnVtYigpO1xyXG4gICAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIERCSGVscGVyLmRiLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAvLyBHZW5lcmljIGVycm9yIGhhbmRsZXIgZm9yIGFsbCBlcnJvcnMgdGFyZ2V0ZWQgYXQgdGhpcyBkYXRhYmFzZSdzXHJcbiAgICAgIC8vIHJlcXVlc3RzIVxyXG4gICAgICBhbGVydChcIkRhdGFiYXNlIGVycm9yOiBcIiArIGV2ZW50LnRhcmdldC5lcnJvckNvZGUpO1xyXG4gICAgfTtcclxuICB9O1xyXG5cclxuICAvLyBFc3RlIGV2ZW50byBzb2xhbWVudGUgZXN0w6EgaW1wbGVtZW50YWRvIGVuIG5hdmVnYWRvcmVzIHJlY2llbnRlc1xyXG4gIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBhbG1hY8OpbiBwYXJhIGNvbnRlbmVyIGxhIGluZm9ybWFjacOzbiBkZSBudWVzdHJvcyBjbGllbnRlXHJcbiAgICAvLyBTZSB1c2Fyw6EgXCJzc25cIiBjb21vIGNsYXZlIHlhIHF1ZSBlcyBnYXJhbnRpemFkbyBxdWUgZXMgw7puaWNhXHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIsIHtcclxuICAgICAga2V5UGF0aDogXCJpZFwiXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZFwiLCBcIm5laWdoYm9yaG9vZFwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gaW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzIHBvciB0aXBvIGRlIGNvY2luYVxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJjdWlzaW5lX3R5cGVcIiwgXCJjdWlzaW5lX3R5cGVcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZC1jdWlzaW5lX3R5cGVcIiwgW1wibmVpZ2hib3Job29kXCIsIFwiY3Vpc2luZV90eXBlXCJdLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIC8vIGRlamFtb3MgYWJpZXJ0YSBudWVzdHJhIGJhc2UgZGUgZGF0b3NcclxuICBsZXQgcmVxdWVzdDIgPSB3aW5kb3cuaW5kZXhlZERCLm9wZW4oXCJyZXZpZXdzLWpzb25cIiwgMSk7XHJcblxyXG4gIHJlcXVlc3QyLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgYWxlcnQoXCJXaHkgZGlkbid0IHlvdSBhbGxvdyBteSB3ZWIgYXBwIHRvIHVzZSBJbmRleGVkREI/IVwiKTtcclxuICB9O1xyXG4gIHJlcXVlc3QyLm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBEQkhlbHBlci5kYjIgPSByZXF1ZXN0Mi5yZXN1bHQ7XHJcblxyXG4gICAgZmV0Y2hSZXZpZXdzRnJvbVVSTCgpO1xyXG5cclxuICAgIERCSGVscGVyLmRiMi5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgLy8gR2VuZXJpYyBlcnJvciBoYW5kbGVyIGZvciBhbGwgZXJyb3JzIHRhcmdldGVkIGF0IHRoaXMgZGF0YWJhc2Unc1xyXG4gICAgICAvLyByZXF1ZXN0cyFcclxuICAgICAgYWxlcnQoXCJEYXRhYmFzZSBlcnJvcjogXCIgKyBldmVudC50YXJnZXQuZXJyb3JDb2RlKTtcclxuICAgIH07XHJcbiAgfTtcclxuXHJcbiAgLy8gRXN0ZSBldmVudG8gc29sYW1lbnRlIGVzdMOhIGltcGxlbWVudGFkbyBlbiBuYXZlZ2Fkb3JlcyByZWNpZW50ZXNcclxuICByZXF1ZXN0Mi5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGFsbWFjw6luIHBhcmEgY29udGVuZXIgbGEgaW5mb3JtYWNpw7NuIGRlIG51ZXN0cm9zIGNsaWVudGVcclxuICAgIC8vIFNlIHVzYXLDoSBcInNzblwiIGNvbW8gY2xhdmUgeWEgcXVlIGVzIGdhcmFudGl6YWRvIHF1ZSBlcyDDum5pY2FcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwicmV2aWV3c1wiLCB7XHJcbiAgICAgIGtleVBhdGg6IFtcInJlc3RhdXJhbnRfaWRcIiwgXCJuYW1lXCIsIFwiY3JlYXRlZEF0XCIsIFwidXBkYXRlZEF0XCJdXHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biDDrW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzcG9yIHZlY2luZGFyaW8uLlxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJyZXN0YXVyYW50X2lkXCIsIFwicmVzdGF1cmFudF9pZFwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3LWZvcm0nKTtcclxuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGZ1bmN0aW9uKGUpe1xyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKFwiLi9qcy9wb3N0V29ya2VyLmpzXCIpO1xyXG5cclxuICAgIHZhciB1c2VybmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCd1c2VybmFtZScpWzBdLnZhbHVlO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3VzZXJuYW1lJylbMF0udmFsdWUgPSBudWxsO1xyXG5cclxuICAgIHZhciByYXRpbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgncmF0aW5nJylbMF0udmFsdWU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgncmF0aW5nJylbMF0udmFsdWUgPSBudWxsO1xyXG5cclxuICAgIHZhciBjb21tZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2NvbW1lbnQnKVswXS52YWx1ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdjb21tZW50JylbMF0udmFsdWUgPSBudWxsO1xyXG5cclxuXHJcbiAgICB2YXIgaWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ2lkJyk7XHJcbiAgICB2YXIgbWVzc2FnZSA9IHtcInJlc3RhdXJhbnRfaWRcIjogcGFyc2VJbnQoaWQpLCBcIm5hbWVcIjogdXNlcm5hbWUsIFwiY3JlYXRlZEF0XCI6IERhdGUubm93KCksIFwidXBkYXRlZEF0XCI6IERhdGUubm93KCksIFwicmF0aW5nXCI6IHJhdGluZywgXCJjb21tZW50c1wiOiBjb21tZW50IH07XHJcblxyXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuICAgIGFkZFJldmlldyhtZXNzYWdlKTtcclxuXHJcbiAgfSk7XHJcbn1cclxuXHJcbmFkZFJldmlldyA9IChtZXNzYWdlKSA9PiB7XHJcblxyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtbGlzdCcpO1xyXG5cclxuICB1bC5hcHBlbmRDaGlsZChjcmVhdGVSZXZpZXdIVE1MKG1lc3NhZ2UpKTtcclxuXHJcbiAgaWYgKERCSGVscGVyLmRiMiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYjIudHJhbnNhY3Rpb24oW1wicmV2aWV3c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJldmlld3NcIik7XHJcblxyXG4gICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQobWVzc2FnZSk7XHJcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgfTtcclxuICBcclxuICB9XHJcblxyXG59XHJcblxyXG4vKipcclxuICogR2V0IGN1cnJlbnQgcmVzdGF1cmFudCBmcm9tIHBhZ2UgVVJMLlxyXG4gKi9cclxuZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCA9IChjYWxsYmFjaykgPT4ge1xyXG4gIGlmIChzZWxmLnJlc3RhdXJhbnQpIHsgLy8gcmVzdGF1cmFudCBhbHJlYWR5IGZldGNoZWQhXHJcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgaWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ2lkJyk7XHJcbiAgaWYgKCFpZCkgeyAvLyBubyBpZCBmb3VuZCBpbiBVUkxcclxuICAgIGVycm9yID0gJ05vIHJlc3RhdXJhbnQgaWQgaW4gVVJMJ1xyXG4gICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCAoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcclxuICAgICAgc2VsZi5yZXN0YXVyYW50ID0gcmVzdGF1cmFudDtcclxuICAgICAgaWYgKCFyZXN0YXVyYW50KSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGZpbGxSZXN0YXVyYW50SFRNTCgpO1xyXG4gICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mZXRjaFJldmlld3NGcm9tVVJMID0gKGNhbGxiYWNrKSA9PiB7XHJcbiAgaWYgKHNlbGYucmV2aWV3KSB7IC8vIHJlc3RhdXJhbnQgYWxyZWFkeSBmZXRjaGVkIVxyXG4gICAgY2FsbGJhY2sobnVsbCwgc2VsZi5yZXZpZXcpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgaWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ2lkJyk7XHJcbiAgaWYgKCFpZCkgeyAvLyBubyBpZCBmb3VuZCBpbiBVUkxcclxuICAgIGVycm9yID0gJ05vIHJlc3RhdXJhbnQgaWQgaW4gVVJMJ1xyXG4gICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBEQkhlbHBlci5mZXRjaFJldmlld1Jlc3RhdXJhbnRCeUlkKGlkLCAoZXJyb3IsIHJldmlld3MpID0+IHtcclxuICAgICAgICBzZWxmLnJldmlld3MgPSByZXZpZXdzO1xyXG4gICAgICAgIGlmICghcmV2aWV3cykge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGZpbGwgcmV2aWV3c1xyXG4gICAgICAgIGZpbGxSZXZpZXdzSFRNTCgpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2VcclxuICovXHJcbmZpbGxSZXN0YXVyYW50SFRNTCA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XHJcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LW5hbWUnKTtcclxuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcclxuXHJcbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWFkZHJlc3MnKTtcclxuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcclxuXHJcbiAgY29uc3QgaW1hZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1pbWcnKTtcclxuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xyXG4gIGltYWdlLnNyYyA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcclxuICBpbWFnZS5hbHQgPSByZXN0YXVyYW50Lm5hbWUgKyAnXFwncyBpbWFnZSBzaG93aW5nIHNvbWUgZGVsaWNpdXMgJyArIHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlICsgJyBmb29kIGNvb2NrZWQgaW4gJyArIHJlc3RhdXJhbnQubmVpZ2hib3Job29kO1xyXG5cclxuICBjb25zdCBjdWlzaW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtY3Vpc2luZScpO1xyXG4gIGN1aXNpbmUuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5jdWlzaW5lX3R5cGU7XHJcblxyXG4gIC8vIGZpbGwgb3BlcmF0aW5nIGhvdXJzXHJcbiAgaWYgKHJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSB7XHJcbiAgICBmaWxsUmVzdGF1cmFudEhvdXJzSFRNTCgpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByZXN0YXVyYW50IG9wZXJhdGluZyBob3VycyBIVE1MIHRhYmxlIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudEhvdXJzSFRNTCA9IChvcGVyYXRpbmdIb3VycyA9IHNlbGYucmVzdGF1cmFudC5vcGVyYXRpbmdfaG91cnMpID0+IHtcclxuICBjb25zdCBob3VycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWhvdXJzJyk7XHJcbiAgZm9yIChsZXQga2V5IGluIG9wZXJhdGluZ0hvdXJzKSB7XHJcbiAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xyXG5cclxuICAgIGNvbnN0IGRheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcbiAgICBkYXkuaW5uZXJIVE1MID0ga2V5O1xyXG4gICAgcm93LmFwcGVuZENoaWxkKGRheSk7XHJcblxyXG4gICAgY29uc3QgdGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcbiAgICB0aW1lLmlubmVySFRNTCA9IG9wZXJhdGluZ0hvdXJzW2tleV07XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQodGltZSk7XHJcblxyXG4gICAgaG91cnMuYXBwZW5kQ2hpbGQocm93KTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWxsIHJldmlld3MgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5maWxsUmV2aWV3c0hUTUwgPSAocmV2aWV3cyA9IHNlbGYucmV2aWV3cykgPT4ge1xyXG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWNvbnRhaW5lcicpO1xyXG5cclxuICBpZiAoIXJldmlld3MpIHtcclxuICAgIGNvbnN0IG5vUmV2aWV3cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICAgIG5vUmV2aWV3cy5pbm5lckhUTUwgPSAnTm8gcmV2aWV3cyB5ZXQhJztcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub1Jldmlld3MpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcclxuICByZXZpZXdzLmZvckVhY2gocmV2aWV3ID0+IHtcclxuICAgIHVsLmFwcGVuZENoaWxkKGNyZWF0ZVJldmlld0hUTUwocmV2aWV3KSk7XHJcbiAgfSk7XHJcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKHVsKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByZXZpZXcgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuY3JlYXRlUmV2aWV3SFRNTCA9IChyZXZpZXcpID0+IHtcclxuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gIGNvbnN0IGRpdk5hbWVEYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgZGl2TmFtZURhdGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJ0aXRsZS1kYXRlLWRpdiBmbGV4LWNvbnRhaW5lclwiKTtcclxuXHJcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBuYW1lLmlubmVySFRNTCA9IHJldmlldy5uYW1lO1xyXG4gIG5hbWUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctdGl0bGVcIik7XHJcbiAgZGl2TmFtZURhdGUuYXBwZW5kQ2hpbGQobmFtZSk7XHJcblxyXG4gIGNvbnN0IGRhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgZGF0ZS5pbm5lckhUTUwgPSBuZXcgRGF0ZShyZXZpZXcudXBkYXRlZEF0KS50b1VUQ1N0cmluZygpO1xyXG4gIGRhdGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctZGF0ZVwiKTtcclxuICBkaXZOYW1lRGF0ZS5hcHBlbmRDaGlsZChkYXRlKTtcclxuXHJcbiAgbGkuYXBwZW5kQ2hpbGQoZGl2TmFtZURhdGUpO1xyXG5cclxuICBjb25zdCBkaXZSYXRpbmdDb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gIGRpdlJhdGluZ0NvbW1lbnRzLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmF0aW5nLWNvbW1lbnQtZGl2XCIpO1xyXG5cclxuICBjb25zdCByYXRpbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgcmF0aW5nLmlubmVySFRNTCA9IGBSYXRpbmc6ICR7cmV2aWV3LnJhdGluZ31gO1xyXG4gIHJhdGluZy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJldmlldy1yYXRpbmdcIik7XHJcbiAgZGl2UmF0aW5nQ29tbWVudHMuYXBwZW5kQ2hpbGQocmF0aW5nKTtcclxuXHJcbiAgY29uc3QgY29tbWVudERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gIGlmIChyZXZpZXcuY29tbWVudHMubGVuZ3RoID4gTUFYX1RFWFRfTEVOR1RIKSB7XHJcbiAgICBjb25zdCBzbmlwZXRUZXh0ID0gcmV2aWV3LmNvbW1lbnRzLnN1YnN0cmluZygwLCBNQVhfVEVYVF9MRU5HVEgpICsgXCIuLi5cIjtcclxuICAgIGNvbnN0IHNuaXBldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICAgIHNuaXBldC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJldmlldy1zbmlwZXRcIik7XHJcbiAgICBzbmlwZXQuaW5uZXJIVE1MID0gc25pcGV0VGV4dDtcclxuICAgIGNvbW1lbnREaXYuYXBwZW5kQ2hpbGQoc25pcGV0KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGNvbW1lbnRzLmlubmVySFRNTCA9IHJldmlldy5jb21tZW50cztcclxuICBjb21tZW50cy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJldmlldy10ZXh0XCIpO1xyXG4gIGlmIChyZXZpZXcuY29tbWVudHMubGVuZ3RoID4gTUFYX1RFWFRfTEVOR1RIKVxyXG4gICAgY29tbWVudHMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICBjb21tZW50RGl2LmFwcGVuZENoaWxkKGNvbW1lbnRzKTtcclxuXHJcbiAgaWYgKHJldmlldy5jb21tZW50cy5sZW5ndGggPiBNQVhfVEVYVF9MRU5HVEgpIHtcclxuICAgIGNvbnN0IGRpc3BsYXlCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgIGRpc3BsYXlCdXR0b24uaW5uZXJIVE1MID0gXCJTZWUgbW9yZS4uLlwiO1xyXG4gICAgZGlzcGxheUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcImRpc3BsYXktYnV0dG9uXCIpO1xyXG4gICAgZGlzcGxheUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLmlubmVySFRNTCA9PT0gXCJTZWUgbW9yZS4uLlwiKSB7XHJcbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBcIlNlZSBsZXNzLi4uXCI7XHJcbiAgICAgICAgdGhpcy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBcIlNlZSBtb3JlLi4uXCI7XHJcbiAgICAgICAgdGhpcy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgdGhpcy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnByZXZpb3VzRWxlbWVudFNpYmxpbmcuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgY29tbWVudERpdi5hcHBlbmRDaGlsZChkaXNwbGF5QnV0dG9uKTtcclxuICB9XHJcblxyXG4gIGRpdlJhdGluZ0NvbW1lbnRzLmFwcGVuZENoaWxkKGNvbW1lbnREaXYpO1xyXG5cclxuICBsaS5hcHBlbmRDaGlsZChkaXZSYXRpbmdDb21tZW50cyk7XHJcblxyXG4gIHJldHVybiBsaTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFkZCByZXN0YXVyYW50IG5hbWUgdG8gdGhlIGJyZWFkY3J1bWIgbmF2aWdhdGlvbiBtZW51XHJcbiAqL1xyXG5maWxsQnJlYWRjcnVtYiA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XHJcbiAgY29uc3QgYnJlYWRjcnVtYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicmVhZGNydW1iJyk7XHJcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gIGxpLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcclxuICBicmVhZGNydW1iLmFwcGVuZENoaWxkKGxpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBhIHBhcmFtZXRlciBieSBuYW1lIGZyb20gcGFnZSBVUkwuXHJcbiAqL1xyXG5nZXRQYXJhbWV0ZXJCeU5hbWUgPSAobmFtZSwgdXJsKSA9PiB7XHJcbiAgaWYgKCF1cmwpXHJcbiAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcclxuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXFxdXS9nLCAnXFxcXCQmJyk7XHJcbiAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBbPyZdJHtuYW1lfSg9KFteJiNdKil8JnwjfCQpYCksXHJcbiAgICByZXN1bHRzID0gcmVnZXguZXhlYyh1cmwpO1xyXG4gIGlmICghcmVzdWx0cylcclxuICAgIHJldHVybiBudWxsO1xyXG4gIGlmICghcmVzdWx0c1syXSlcclxuICAgIHJldHVybiAnJztcclxuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csICcgJykpO1xyXG59IiwiZnVuY3Rpb24gcmVnaXN0ZXJTVygpIHsgICAgXHJcblxyXG4gICAgaWYgKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSB7XHJcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3N3LmpzJykudGhlbihmdW5jdGlvbiAocmVnKSB7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVnLndhaXRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0cmFja0luc3RhbGxpbmcocmVnLmluc3RhbGxpbmcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZWcuYWRkRXZlbnRMaXN0ZW5lcigndXBkYXRlZm91bmQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB0cmFja0luc3RhbGxpbmcocmVnLmluc3RhbGxpbmcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJlZnJlc2hpbmc7XHJcbiAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignY29udHJvbGxlcmNoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHJlZnJlc2hpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xyXG4gICAgICAgICAgICByZWZyZXNoaW5nID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgIH1cclxufVxyXG5cclxudXBkYXRlUmVhZHkgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBhY3Rpb246ICdza2lwV2FpdGluZycgfSk7XHJcbn07XHJcblxyXG50cmFja0luc3RhbGxpbmcgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PSAnaW5zdGFsbGVkJykge1xyXG4gICAgICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59OyJdfQ==
