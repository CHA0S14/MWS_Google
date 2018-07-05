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
      var request = objectStore.get(id);

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX3Jlc3RhdXJhbnQuanMiLCJyZXN0YXVyYW50X2luZm8uanMiLCJzd1JlZ2lzdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbF9yZXN0YXVyYW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIFxyXG4gKiBDb21tb24gZGF0YWJhc2UgaGVscGVyIGZ1bmN0aW9ucy5cclxuICovXHJcbmNsYXNzIERCSGVscGVyIHtcclxuICAvKipcclxuICAgKiBEYXRhYmFzZSBVUkwuXHJcbiAgICogQ2hhbmdlIHRoaXMgdG8gcmVzdGF1cmFudHMuanNvbiBmaWxlIGxvY2F0aW9uIG9uIHlvdXIgc2VydmVyLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXQgREFUQUJBU0VfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jlc3RhdXJhbnRzYDtcclxuICB9XHJcbiAgc3RhdGljIGdldCBSRVZJRVdfVVJMKCkge1xyXG4gICAgY29uc3QgcG9ydCA9IDEzMzc7IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jldmlld3MvP3Jlc3RhdXJhbnRfaWQ9YDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBnZXRSZXN0YXVyYW50RnJvbUFwaSh1cmwsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcmVzdGF1cmFudERhdGEgPSBmZXRjaCh1cmwpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgICAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIik7XHJcblxyXG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UpKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChyZXNwb25zZVtpXSk7XHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZ2V0UmV2aWV3c0Zyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYjIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIyLnRyYW5zYWN0aW9uKFtcInJldmlld3NcIl0sIFwicmVhZHdyaXRlXCIpO1xyXG4gICAgICAgICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIHJlc3BvbnNlW2ldLmlkO1xyXG4gICAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlW2ldKTtcclxuICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWxldGUgcmVzcG9uc2UuaWQ7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhIHJlc3RhdXJhbnQgYnkgaXRzIElELlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHVybCA9IERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGAvJHtpZH1gO1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChpZCk7XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcblxyXG4gICAgICAgIGlmKHJlcXVlc3QucmVzdWx0ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJObyByZXN0YXVyYW50IGZvdW5kXCIsIG51bGwpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgIERCSGVscGVyLmdldFJlc3RhdXJhbnRGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXZpZXdSZXN0YXVyYW50QnlJZChpZCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICB2YXIgdXJsID0gREJIZWxwZXIuUkVWSUVXX1VSTCArIGAke2lkfWA7XHJcbiAgICBpZiAoREJIZWxwZXIuZGIyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIyLnRyYW5zYWN0aW9uKFtcInJldmlld3NcIl0pO1xyXG4gICAgICB2YXIgaW5kZXggPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJldmlld3NcIikuaW5kZXgoXCJyZXN0YXVyYW50X2lkXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IGluZGV4LmdldEFsbChwYXJzZUludChpZCkpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGlmKHJlcXVlc3QucmVzdWx0ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJObyByZXN0YXVyYW50IGZvdW5kXCIsIG51bGwpO1xyXG4gICAgICAgICAgLy8gUmVxdWVzdCB0byBhcGkgdG8gdXBkYXRlIGluZGV4ZWREQlxyXG4gICAgICAgICAgREJIZWxwZXIuZ2V0RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIHZhciBjYWNoZVJldmlld3MgPSByZXF1ZXN0LnJlc3VsdDtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgICBEQkhlbHBlci5nZXRSZXZpZXdzRnJvbUFwaSh1cmwsIChlcnJvciwgcmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgICAgIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKFwiLi9qcy91cGRhdGVyUmV2aWV3QXBpV29ya2VyLmpzXCIpO1xyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFtjYWNoZVJldmlld3MsIHJlc3BvbnNlXTtcclxuXHJcbiAgICAgICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICAgIGlmKCFyZXF1ZXN0LnJlc3VsdClcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvcixyZXNwb25zZSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgREJIZWxwZXIuZ2V0UmV2aWV3c0Zyb21BcGkodXJsLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IHBhZ2UgVVJMLlxyXG4gICAqL1xyXG4gIHN0YXRpYyB1cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC4vcmVzdGF1cmFudC5odG1sP2lkPSR7cmVzdGF1cmFudC5pZH1gKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgaW1hZ2UgVVJMLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBpbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgL2ltZy8ke3Jlc3RhdXJhbnQucGhvdG9ncmFwaH0uanBnYCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNYXAgbWFya2VyIGZvciBhIHJlc3RhdXJhbnQuXHJcbiAgICovXHJcbiAgc3RhdGljIG1hcE1hcmtlckZvclJlc3RhdXJhbnQocmVzdGF1cmFudCwgbWFwKSB7XHJcbiAgICBjb25zdCBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgcG9zaXRpb246IHJlc3RhdXJhbnQubGF0bG5nLFxyXG4gICAgICB0aXRsZTogcmVzdGF1cmFudC5uYW1lLFxyXG4gICAgICB1cmw6IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCksXHJcbiAgICAgIG1hcDogbWFwLFxyXG4gICAgICBhbmltYXRpb246IGdvb2dsZS5tYXBzLkFuaW1hdGlvbi5EUk9QXHJcbiAgICB9KTtcclxuICAgIHJldHVybiBtYXJrZXI7XHJcbiAgfVxyXG5cclxufSIsImxldCByZXN0YXVyYW50O1xyXG5sZXQgcmV2aWV3cztcclxudmFyIG1hcDtcclxuY29uc3QgTUFYX1RFWFRfTEVOR1RIID0gNDAwO1xyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgR29vZ2xlIG1hcCwgY2FsbGVkIGZyb20gSFRNTC5cclxuICovXHJcbndpbmRvdy5pbml0TWFwID0gKCkgPT4ge1xyXG5cclxuICB2YXIgaW5kZXhlZERCID0gd2luZG93LmluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy53ZWJraXRJbmRleGVkREIgfHwgd2luZG93Lm1zSW5kZXhlZERCIHx8IHdpbmRvdy5zaGltSW5kZXhlZERCO1xyXG5cclxuICBpZiAoIXdpbmRvdy5pbmRleGVkREIpIHtcclxuICAgIHdpbmRvdy5hbGVydChcIlN1IG5hdmVnYWRvciBubyBzb3BvcnRhIHVuYSB2ZXJzacOzbiBlc3RhYmxlIGRlIGluZGV4ZWREQi4gVGFsIHkgY29tbyBsYXMgY2FyYWN0ZXLDrXN0aWNhcyBubyBzZXLDoW4gdmFsaWRhc1wiKTtcclxuXHJcbiAgICBmZXRjaFJlc3RhdXJhbnRGcm9tVVJMKChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgICAgICAgIHpvb206IDE2LFxyXG4gICAgICAgICAgY2VudGVyOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmaWxsQnJlYWRjcnVtYigpO1xyXG4gICAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVqYW1vcyBhYmllcnRhIG51ZXN0cmEgYmFzZSBkZSBkYXRvc1xyXG4gIGxldCByZXF1ZXN0ID0gd2luZG93LmluZGV4ZWREQi5vcGVuKFwicmVzdGF1cmFudHMtanNvblwiLCAxKTtcclxuXHJcbiAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIGFsZXJ0KFwiV2h5IGRpZG4ndCB5b3UgYWxsb3cgbXkgd2ViIGFwcCB0byB1c2UgSW5kZXhlZERCPyFcIik7XHJcbiAgfTtcclxuICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBEQkhlbHBlci5kYiA9IHJlcXVlc3QucmVzdWx0O1xyXG5cclxuICAgIGZldGNoUmVzdGF1cmFudEZyb21VUkwoKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2VsZi5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwge1xyXG4gICAgICAgICAgem9vbTogMTYsXHJcbiAgICAgICAgICBjZW50ZXI6IHJlc3RhdXJhbnQubGF0bG5nLFxyXG4gICAgICAgICAgc2Nyb2xsd2hlZWw6IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZpbGxCcmVhZGNydW1iKCk7XHJcbiAgICAgICAgREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChzZWxmLnJlc3RhdXJhbnQsIHNlbGYubWFwKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgREJIZWxwZXIuZGIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgIC8vIEdlbmVyaWMgZXJyb3IgaGFuZGxlciBmb3IgYWxsIGVycm9ycyB0YXJnZXRlZCBhdCB0aGlzIGRhdGFiYXNlJ3NcclxuICAgICAgLy8gcmVxdWVzdHMhXHJcbiAgICAgIGFsZXJ0KFwiRGF0YWJhc2UgZXJyb3I6IFwiICsgZXZlbnQudGFyZ2V0LmVycm9yQ29kZSk7XHJcbiAgICB9O1xyXG4gIH07XHJcblxyXG4gIC8vIEVzdGUgZXZlbnRvIHNvbGFtZW50ZSBlc3TDoSBpbXBsZW1lbnRhZG8gZW4gbmF2ZWdhZG9yZXMgcmVjaWVudGVzXHJcbiAgcmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGFsbWFjw6luIHBhcmEgY29udGVuZXIgbGEgaW5mb3JtYWNpw7NuIGRlIG51ZXN0cm9zIGNsaWVudGVcclxuICAgIC8vIFNlIHVzYXLDoSBcInNzblwiIGNvbW8gY2xhdmUgeWEgcXVlIGVzIGdhcmFudGl6YWRvIHF1ZSBlcyDDum5pY2FcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwicmVzdGF1cmFudHNcIiwge1xyXG4gICAgICBrZXlQYXRoOiBcImlkXCJcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gw61uZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlc3BvciB2ZWNpbmRhcmlvLi5cclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwibmVpZ2hib3Job29kXCIsIFwibmVpZ2hib3Job29kXCIsIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBpbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXMgcG9yIHRpcG8gZGUgY29jaW5hXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcImN1aXNpbmVfdHlwZVwiLCBcImN1aXNpbmVfdHlwZVwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gw61uZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlc3BvciB2ZWNpbmRhcmlvLi5cclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwibmVpZ2hib3Job29kLWN1aXNpbmVfdHlwZVwiLCBbXCJuZWlnaGJvcmhvb2RcIiwgXCJjdWlzaW5lX3R5cGVcIl0sIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgLy8gZGVqYW1vcyBhYmllcnRhIG51ZXN0cmEgYmFzZSBkZSBkYXRvc1xyXG4gIGxldCByZXF1ZXN0MiA9IHdpbmRvdy5pbmRleGVkREIub3BlbihcInJldmlld3MtanNvblwiLCAxKTtcclxuXHJcbiAgcmVxdWVzdDIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBhbGVydChcIldoeSBkaWRuJ3QgeW91IGFsbG93IG15IHdlYiBhcHAgdG8gdXNlIEluZGV4ZWREQj8hXCIpO1xyXG4gIH07XHJcbiAgcmVxdWVzdDIub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIERCSGVscGVyLmRiMiA9IHJlcXVlc3QyLnJlc3VsdDtcclxuXHJcbiAgICBmZXRjaFJldmlld3NGcm9tVVJMKCk7XHJcblxyXG4gICAgREJIZWxwZXIuZGIyLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAvLyBHZW5lcmljIGVycm9yIGhhbmRsZXIgZm9yIGFsbCBlcnJvcnMgdGFyZ2V0ZWQgYXQgdGhpcyBkYXRhYmFzZSdzXHJcbiAgICAgIC8vIHJlcXVlc3RzIVxyXG4gICAgICBhbGVydChcIkRhdGFiYXNlIGVycm9yOiBcIiArIGV2ZW50LnRhcmdldC5lcnJvckNvZGUpO1xyXG4gICAgfTtcclxuICB9O1xyXG5cclxuICAvLyBFc3RlIGV2ZW50byBzb2xhbWVudGUgZXN0w6EgaW1wbGVtZW50YWRvIGVuIG5hdmVnYWRvcmVzIHJlY2llbnRlc1xyXG4gIHJlcXVlc3QyLm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICB2YXIgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gYWxtYWPDqW4gcGFyYSBjb250ZW5lciBsYSBpbmZvcm1hY2nDs24gZGUgbnVlc3Ryb3MgY2xpZW50ZVxyXG4gICAgLy8gU2UgdXNhcsOhIFwic3NuXCIgY29tbyBjbGF2ZSB5YSBxdWUgZXMgZ2FyYW50aXphZG8gcXVlIGVzIMO6bmljYVxyXG4gICAgdmFyIG9iamVjdFN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIsIHtcclxuICAgICAga2V5UGF0aDogW1wicmVzdGF1cmFudF9pZFwiLCBcIm5hbWVcIiwgXCJjcmVhdGVkQXRcIiwgXCJ1cGRhdGVkQXRcIl1cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcInJlc3RhdXJhbnRfaWRcIiwgXCJyZXN0YXVyYW50X2lkXCIsIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXctZm9ybScpO1xyXG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsZnVuY3Rpb24oZSl7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgdmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoXCIuL2pzL3Bvc3RXb3JrZXIuanNcIik7XHJcblxyXG4gICAgdmFyIHVzZXJuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3VzZXJuYW1lJylbMF0udmFsdWU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgndXNlcm5hbWUnKVswXS52YWx1ZSA9IG51bGw7XHJcblxyXG4gICAgdmFyIHJhdGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdyYXRpbmcnKVswXS52YWx1ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdyYXRpbmcnKVswXS52YWx1ZSA9IG51bGw7XHJcblxyXG4gICAgdmFyIGNvbW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnY29tbWVudCcpWzBdLnZhbHVlO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2NvbW1lbnQnKVswXS52YWx1ZSA9IG51bGw7XHJcblxyXG5cclxuICAgIHZhciBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcclxuICAgIHZhciBtZXNzYWdlID0ge1wicmVzdGF1cmFudF9pZFwiOiBwYXJzZUludChpZCksIFwibmFtZVwiOiB1c2VybmFtZSwgXCJjcmVhdGVkQXRcIjogRGF0ZS5ub3coKSwgXCJ1cGRhdGVkQXRcIjogRGF0ZS5ub3coKSwgXCJyYXRpbmdcIjogcmF0aW5nLCBcImNvbW1lbnRzXCI6IGNvbW1lbnQgfTtcclxuXHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSk7XHJcblxyXG4gICAgYWRkUmV2aWV3KG1lc3NhZ2UpO1xyXG5cclxuICB9KTtcclxufVxyXG5cclxuYWRkUmV2aWV3ID0gKG1lc3NhZ2UpID0+IHtcclxuXHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XHJcblxyXG4gIHVsLmFwcGVuZENoaWxkKGNyZWF0ZVJldmlld0hUTUwobWVzc2FnZSkpO1xyXG5cclxuICBpZiAoREJIZWxwZXIuZGIyICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiMi50cmFuc2FjdGlvbihbXCJyZXZpZXdzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmV2aWV3c1wiKTtcclxuXHJcbiAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChtZXNzYWdlKTtcclxuICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICB9O1xyXG4gIFxyXG4gIH1cclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgY3VycmVudCByZXN0YXVyYW50IGZyb20gcGFnZSBVUkwuXHJcbiAqL1xyXG5mZXRjaFJlc3RhdXJhbnRGcm9tVVJMID0gKGNhbGxiYWNrKSA9PiB7XHJcbiAgaWYgKHNlbGYucmVzdGF1cmFudCkgeyAvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcclxuICAgIGNhbGxiYWNrKG51bGwsIHNlbGYucmVzdGF1cmFudCk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcclxuICBpZiAoIWlkKSB7IC8vIG5vIGlkIGZvdW5kIGluIFVSTFxyXG4gICAgZXJyb3IgPSAnTm8gcmVzdGF1cmFudCBpZCBpbiBVUkwnXHJcbiAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICBzZWxmLnJlc3RhdXJhbnQgPSByZXN0YXVyYW50O1xyXG4gICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgZmlsbFJlc3RhdXJhbnRIVE1MKCk7XHJcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZldGNoUmV2aWV3c0Zyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcclxuICBpZiAoc2VsZi5yZXZpZXcpIHsgLy8gcmVzdGF1cmFudCBhbHJlYWR5IGZldGNoZWQhXHJcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJldmlldyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcclxuICBpZiAoIWlkKSB7IC8vIG5vIGlkIGZvdW5kIGluIFVSTFxyXG4gICAgZXJyb3IgPSAnTm8gcmVzdGF1cmFudCBpZCBpbiBVUkwnXHJcbiAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIERCSGVscGVyLmZldGNoUmV2aWV3UmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmV2aWV3cykgPT4ge1xyXG4gICAgICAgIHNlbGYucmV2aWV3cyA9IHJldmlld3M7XHJcbiAgICAgICAgaWYgKCFyZXZpZXdzKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZmlsbCByZXZpZXdzXHJcbiAgICAgICAgZmlsbFJldmlld3NIVE1MKCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZVxyXG4gKi9cclxuZmlsbFJlc3RhdXJhbnRIVE1MID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcclxuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtbmFtZScpO1xyXG4gIG5hbWUuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xyXG5cclxuICBjb25zdCBhZGRyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtYWRkcmVzcycpO1xyXG4gIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xyXG5cclxuICBjb25zdCBpbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWltZycpO1xyXG4gIGltYWdlLmNsYXNzTmFtZSA9ICdyZXN0YXVyYW50LWltZyc7XHJcbiAgaW1hZ2Uuc3JjID0gREJIZWxwZXIuaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xyXG4gIGltYWdlLmFsdCA9IHJlc3RhdXJhbnQubmFtZSArICdcXCdzIGltYWdlIHNob3dpbmcgc29tZSBkZWxpY2l1cyAnICsgcmVzdGF1cmFudC5jdWlzaW5lX3R5cGUgKyAnIGZvb2QgY29vY2tlZCBpbiAnICsgcmVzdGF1cmFudC5uZWlnaGJvcmhvb2Q7XHJcblxyXG4gIGNvbnN0IGN1aXNpbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1jdWlzaW5lJyk7XHJcbiAgY3Vpc2luZS5pbm5lckhUTUwgPSByZXN0YXVyYW50LmN1aXNpbmVfdHlwZTtcclxuXHJcbiAgLy8gZmlsbCBvcGVyYXRpbmcgaG91cnNcclxuICBpZiAocmVzdGF1cmFudC5vcGVyYXRpbmdfaG91cnMpIHtcclxuICAgIGZpbGxSZXN0YXVyYW50SG91cnNIVE1MKCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgb3BlcmF0aW5nIGhvdXJzIEhUTUwgdGFibGUgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmZpbGxSZXN0YXVyYW50SG91cnNIVE1MID0gKG9wZXJhdGluZ0hvdXJzID0gc2VsZi5yZXN0YXVyYW50Lm9wZXJhdGluZ19ob3VycykgPT4ge1xyXG4gIGNvbnN0IGhvdXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaG91cnMnKTtcclxuICBmb3IgKGxldCBrZXkgaW4gb3BlcmF0aW5nSG91cnMpIHtcclxuICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XHJcblxyXG4gICAgY29uc3QgZGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcclxuICAgIGRheS5pbm5lckhUTUwgPSBrZXk7XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQoZGF5KTtcclxuXHJcbiAgICBjb25zdCB0aW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcclxuICAgIHRpbWUuaW5uZXJIVE1MID0gb3BlcmF0aW5nSG91cnNba2V5XTtcclxuICAgIHJvdy5hcHBlbmRDaGlsZCh0aW1lKTtcclxuXHJcbiAgICBob3Vycy5hcHBlbmRDaGlsZChyb3cpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhbGwgcmV2aWV3cyBIVE1MIGFuZCBhZGQgdGhlbSB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmZpbGxSZXZpZXdzSFRNTCA9IChyZXZpZXdzID0gc2VsZi5yZXZpZXdzKSA9PiB7XHJcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtY29udGFpbmVyJyk7XHJcblxyXG4gIGlmICghcmV2aWV3cykge1xyXG4gICAgY29uc3Qgbm9SZXZpZXdzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgbm9SZXZpZXdzLmlubmVySFRNTCA9ICdObyByZXZpZXdzIHlldCEnO1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5vUmV2aWV3cyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtbGlzdCcpO1xyXG4gIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xyXG4gICAgdWwuYXBwZW5kQ2hpbGQoY3JlYXRlUmV2aWV3SFRNTChyZXZpZXcpKTtcclxuICB9KTtcclxuICBjb250YWluZXIuYXBwZW5kQ2hpbGQodWwpO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJldmlldyBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXHJcbiAqL1xyXG5jcmVhdGVSZXZpZXdIVE1MID0gKHJldmlldykgPT4ge1xyXG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuXHJcbiAgY29uc3QgZGl2TmFtZURhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBkaXZOYW1lRGF0ZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInRpdGxlLWRhdGUtZGl2IGZsZXgtY29udGFpbmVyXCIpO1xyXG5cclxuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIG5hbWUuaW5uZXJIVE1MID0gcmV2aWV3Lm5hbWU7XHJcbiAgbmFtZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJldmlldy10aXRsZVwiKTtcclxuICBkaXZOYW1lRGF0ZS5hcHBlbmRDaGlsZChuYW1lKTtcclxuXHJcbiAgY29uc3QgZGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBkYXRlLmlubmVySFRNTCA9IG5ldyBEYXRlKHJldmlldy51cGRhdGVkQXQpLnRvVVRDU3RyaW5nKCk7XHJcbiAgZGF0ZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJldmlldy1kYXRlXCIpO1xyXG4gIGRpdk5hbWVEYXRlLmFwcGVuZENoaWxkKGRhdGUpO1xyXG5cclxuICBsaS5hcHBlbmRDaGlsZChkaXZOYW1lRGF0ZSk7XHJcblxyXG4gIGNvbnN0IGRpdlJhdGluZ0NvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgZGl2UmF0aW5nQ29tbWVudHMuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyYXRpbmctY29tbWVudC1kaXZcIik7XHJcblxyXG4gIGNvbnN0IHJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICByYXRpbmcuaW5uZXJIVE1MID0gYFJhdGluZzogJHtyZXZpZXcucmF0aW5nfWA7XHJcbiAgcmF0aW5nLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LXJhdGluZ1wiKTtcclxuICBkaXZSYXRpbmdDb21tZW50cy5hcHBlbmRDaGlsZChyYXRpbmcpO1xyXG5cclxuICBjb25zdCBjb21tZW50RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgaWYgKHJldmlldy5jb21tZW50cy5sZW5ndGggPiBNQVhfVEVYVF9MRU5HVEgpIHtcclxuICAgIGNvbnN0IHNuaXBldFRleHQgPSByZXZpZXcuY29tbWVudHMuc3Vic3RyaW5nKDAsIE1BWF9URVhUX0xFTkdUSCkgKyBcIi4uLlwiO1xyXG4gICAgY29uc3Qgc25pcGV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgc25pcGV0LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LXNuaXBldFwiKTtcclxuICAgIHNuaXBldC5pbm5lckhUTUwgPSBzbmlwZXRUZXh0O1xyXG4gICAgY29tbWVudERpdi5hcHBlbmRDaGlsZChzbmlwZXQpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgY29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgY29tbWVudHMuaW5uZXJIVE1MID0gcmV2aWV3LmNvbW1lbnRzO1xyXG4gIGNvbW1lbnRzLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LXRleHRcIik7XHJcbiAgaWYgKHJldmlldy5jb21tZW50cy5sZW5ndGggPiBNQVhfVEVYVF9MRU5HVEgpXHJcbiAgICBjb21tZW50cy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gIGNvbW1lbnREaXYuYXBwZW5kQ2hpbGQoY29tbWVudHMpO1xyXG5cclxuICBpZiAocmV2aWV3LmNvbW1lbnRzLmxlbmd0aCA+IE1BWF9URVhUX0xFTkdUSCkge1xyXG4gICAgY29uc3QgZGlzcGxheUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG4gICAgZGlzcGxheUJ1dHRvbi5pbm5lckhUTUwgPSBcIlNlZSBtb3JlLi4uXCI7XHJcbiAgICBkaXNwbGF5QnV0dG9uLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwiZGlzcGxheS1idXR0b25cIik7XHJcbiAgICBkaXNwbGF5QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuaW5uZXJIVE1MID09PSBcIlNlZSBtb3JlLi4uXCIpIHtcclxuICAgICAgICB0aGlzLmlubmVySFRNTCA9IFwiU2VlIGxlc3MuLi5cIjtcclxuICAgICAgICB0aGlzLnByZXZpb3VzRWxlbWVudFNpYmxpbmcuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICAgICAgdGhpcy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnByZXZpb3VzRWxlbWVudFNpYmxpbmcuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmlubmVySFRNTCA9IFwiU2VlIG1vcmUuLi5cIjtcclxuICAgICAgICB0aGlzLnByZXZpb3VzRWxlbWVudFNpYmxpbmcuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLnByZXZpb3VzRWxlbWVudFNpYmxpbmcucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBjb21tZW50RGl2LmFwcGVuZENoaWxkKGRpc3BsYXlCdXR0b24pO1xyXG4gIH1cclxuXHJcbiAgZGl2UmF0aW5nQ29tbWVudHMuYXBwZW5kQ2hpbGQoY29tbWVudERpdik7XHJcblxyXG4gIGxpLmFwcGVuZENoaWxkKGRpdlJhdGluZ0NvbW1lbnRzKTtcclxuXHJcbiAgcmV0dXJuIGxpO1xyXG59XHJcblxyXG4vKipcclxuICogQWRkIHJlc3RhdXJhbnQgbmFtZSB0byB0aGUgYnJlYWRjcnVtYiBuYXZpZ2F0aW9uIG1lbnVcclxuICovXHJcbmZpbGxCcmVhZGNydW1iID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcclxuICBjb25zdCBicmVhZGNydW1iID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JyZWFkY3J1bWInKTtcclxuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgbGkuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xyXG4gIGJyZWFkY3J1bWIuYXBwZW5kQ2hpbGQobGkpO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IGEgcGFyYW1ldGVyIGJ5IG5hbWUgZnJvbSBwYWdlIFVSTC5cclxuICovXHJcbmdldFBhcmFtZXRlckJ5TmFtZSA9IChuYW1lLCB1cmwpID0+IHtcclxuICBpZiAoIXVybClcclxuICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xyXG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtcXF1dL2csICdcXFxcJCYnKTtcclxuICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoYFs/Jl0ke25hbWV9KD0oW14mI10qKXwmfCN8JClgKSxcclxuICAgIHJlc3VsdHMgPSByZWdleC5leGVjKHVybCk7XHJcbiAgaWYgKCFyZXN1bHRzKVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgaWYgKCFyZXN1bHRzWzJdKVxyXG4gICAgcmV0dXJuICcnO1xyXG4gIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1syXS5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XHJcbn0iLCJmdW5jdGlvbiByZWdpc3RlclNXKCkgeyAgICBcclxuXHJcbiAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcignc3cuanMnKS50aGVuKGZ1bmN0aW9uIChyZWcpIHtcclxuICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZWcud2FpdGluZykge1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlUmVhZHkocmVnLndhaXRpbmcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVnLmluc3RhbGxpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlZy5hZGRFdmVudExpc3RlbmVyKCd1cGRhdGVmb3VuZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB2YXIgcmVmcmVzaGluZztcclxuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAocmVmcmVzaGluZykgcmV0dXJuO1xyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICAgICAgICAgIHJlZnJlc2hpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG59XHJcblxyXG51cGRhdGVSZWFkeSA9IGZ1bmN0aW9uICh3b3JrZXIpIHtcclxuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7IGFjdGlvbjogJ3NraXBXYWl0aW5nJyB9KTtcclxufTtcclxuXHJcbnRyYWNrSW5zdGFsbGluZyA9IGZ1bmN0aW9uICh3b3JrZXIpIHtcclxuICAgIHdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAod29ya2VyLnN0YXRlID09ICdpbnN0YWxsZWQnKSB7XHJcbiAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHdvcmtlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07Il19
