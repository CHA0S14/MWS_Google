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
        }else{
          var cacheReviews = request.result;
          callback(null, request.result);

          // Request to api to update indexedDB
          DBHelper.getReviewsFromApi(url, (error, response) => {

            var worker = new Worker("./js/updateApiWorker.js");
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
registerSW();

function registerSW() {
    if (navigator.serviceWorker) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/js/sw.js').then(function (reg) {
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

            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX3Jlc3RhdXJhbnQuanMiLCJyZXN0YXVyYW50X2luZm8uanMiLCJzd1JlZ2lzdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhbGxfcmVzdGF1cmFudC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQ29tbW9uIGRhdGFiYXNlIGhlbHBlciBmdW5jdGlvbnMuXHJcbiAqL1xyXG5jbGFzcyBEQkhlbHBlciB7XHJcbiAgLyoqXHJcbiAgICogRGF0YWJhc2UgVVJMLlxyXG4gICAqIENoYW5nZSB0aGlzIHRvIHJlc3RhdXJhbnRzLmpzb24gZmlsZSBsb2NhdGlvbiBvbiB5b3VyIHNlcnZlci5cclxuICAgKi9cclxuICBzdGF0aWMgZ2V0IERBVEFCQVNFX1VSTCgpIHtcclxuICAgIGNvbnN0IHBvcnQgPSAxMzM3OyAvLyBDaGFuZ2UgdGhpcyB0byB5b3VyIHNlcnZlciBwb3J0XHJcbiAgICByZXR1cm4gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fS9yZXN0YXVyYW50c2A7XHJcbiAgfVxyXG4gIHN0YXRpYyBnZXQgUkVWSUVXX1VSTCgpIHtcclxuICAgIGNvbnN0IHBvcnQgPSAxMzM3OyAvLyBDaGFuZ2UgdGhpcyB0byB5b3VyIHNlcnZlciBwb3J0XHJcbiAgICByZXR1cm4gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fS9yZXZpZXdzLz9yZXN0YXVyYW50X2lkPWA7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZ2V0UmVzdGF1cmFudEZyb21BcGkodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHJlc3RhdXJhbnREYXRhID0gZmV0Y2godXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYi50cmFuc2FjdGlvbihbXCJyZXN0YXVyYW50c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICAgICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG5cclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2VbaV0pO1xyXG4gICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IChgUmVxdWVzdCBmYWlsZWQuICR7ZX1gKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldFJldmlld3NGcm9tQXBpKHVybCwgY2FsbGJhY2spIHtcclxuICAgIHZhciByZXN0YXVyYW50RGF0YSA9IGZldGNoKHVybClcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICBpZiAoREJIZWxwZXIuZGIyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiMi50cmFuc2FjdGlvbihbXCJyZXZpZXdzXCJdLCBcInJlYWR3cml0ZVwiKTtcclxuICAgICAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmV2aWV3c1wiKTtcclxuXHJcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNwb25zZSkpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiByZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIGRlbGV0ZSByZXNwb25zZVtpXS5pZDtcclxuICAgICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChyZXNwb25zZVtpXSk7XHJcbiAgICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZGVsZXRlIHJlc3BvbnNlLmlkO1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IChgUmVxdWVzdCBmYWlsZWQuICR7ZX1gKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlJZChpZCwgY2FsbGJhY2spIHtcclxuICAgIHZhciB1cmwgPSBEQkhlbHBlci5EQVRBQkFTRV9VUkwgKyBgLyR7aWR9YDtcclxuICAgIGlmIChEQkhlbHBlci5kYiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiLnRyYW5zYWN0aW9uKFtcInJlc3RhdXJhbnRzXCJdKTtcclxuICAgICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXN0YXVyYW50c1wiKTtcclxuICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5nZXQoaWQpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG5cclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICBEQkhlbHBlci5nZXRSZXN0YXVyYW50RnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmV2aWV3UmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcblxyXG4gICAgdmFyIHVybCA9IERCSGVscGVyLlJFVklFV19VUkwgKyBgJHtpZH1gO1xyXG4gICAgaWYgKERCSGVscGVyLmRiMiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHZhciB0cmFuc2FjdGlvbiA9IERCSGVscGVyLmRiMi50cmFuc2FjdGlvbihbXCJyZXZpZXdzXCJdKTtcclxuICAgICAgdmFyIGluZGV4ID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIpLmluZGV4KFwicmVzdGF1cmFudF9pZFwiKTtcclxuICAgICAgdmFyIHJlcXVlc3QgPSBpbmRleC5nZXRBbGwocGFyc2VJbnQoaWQpKTtcclxuXHJcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICBpZihyZXF1ZXN0LnJlc3VsdCA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgIGNhbGxiYWNrKFwiTm8gcmVzdGF1cmFudCBmb3VuZFwiLCBudWxsKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgIHZhciBjYWNoZVJldmlld3MgPSByZXF1ZXN0LnJlc3VsdDtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QucmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAvLyBSZXF1ZXN0IHRvIGFwaSB0byB1cGRhdGUgaW5kZXhlZERCXHJcbiAgICAgICAgICBEQkhlbHBlci5nZXRSZXZpZXdzRnJvbUFwaSh1cmwsIChlcnJvciwgcmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgICAgIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKFwiLi9qcy91cGRhdGVBcGlXb3JrZXIuanNcIik7XHJcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gW2NhY2hlUmV2aWV3cywgcmVzcG9uc2VdO1xyXG5cclxuICAgICAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgaWYoIXJlcXVlc3QucmVzdWx0KVxyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLHJlc3BvbnNlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgICAgICBEQkhlbHBlci5nZXRSZXZpZXdzRnJvbUFwaSh1cmwsIGNhbGxiYWNrKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAvaW1nLyR7cmVzdGF1cmFudC5waG90b2dyYXBofS5qcGdgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBtYXJrZXIgZm9yIGEgcmVzdGF1cmFudC5cclxuICAgKi9cclxuICBzdGF0aWMgbWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBtYXApIHtcclxuICAgIGNvbnN0IG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICBwb3NpdGlvbjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgIHRpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIHVybDogREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSxcclxuICAgICAgbWFwOiBtYXAsXHJcbiAgICAgIGFuaW1hdGlvbjogZ29vZ2xlLm1hcHMuQW5pbWF0aW9uLkRST1BcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9XHJcblxyXG59IiwibGV0IHJlc3RhdXJhbnQ7XHJcbmxldCByZXZpZXdzO1xyXG52YXIgbWFwO1xyXG5jb25zdCBNQVhfVEVYVF9MRU5HVEggPSA0MDA7XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxyXG4gKi9cclxud2luZG93LmluaXRNYXAgPSAoKSA9PiB7XHJcblxyXG4gIHZhciBpbmRleGVkREIgPSB3aW5kb3cuaW5kZXhlZERCIHx8IHdpbmRvdy5tb3pJbmRleGVkREIgfHwgd2luZG93LndlYmtpdEluZGV4ZWREQiB8fCB3aW5kb3cubXNJbmRleGVkREIgfHwgd2luZG93LnNoaW1JbmRleGVkREI7XHJcblxyXG4gIGlmICghd2luZG93LmluZGV4ZWREQikge1xyXG4gICAgd2luZG93LmFsZXJ0KFwiU3UgbmF2ZWdhZG9yIG5vIHNvcG9ydGEgdW5hIHZlcnNpw7NuIGVzdGFibGUgZGUgaW5kZXhlZERCLiBUYWwgeSBjb21vIGxhcyBjYXJhY3RlcsOtc3RpY2FzIG5vIHNlcsOhbiB2YWxpZGFzXCIpO1xyXG5cclxuICAgIGZldGNoUmVzdGF1cmFudEZyb21VUkwoKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2VsZi5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwge1xyXG4gICAgICAgICAgem9vbTogMTYsXHJcbiAgICAgICAgICBjZW50ZXI6IHJlc3RhdXJhbnQubGF0bG5nLFxyXG4gICAgICAgICAgc2Nyb2xsd2hlZWw6IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZpbGxCcmVhZGNydW1iKCk7XHJcbiAgICAgICAgREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChzZWxmLnJlc3RhdXJhbnQsIHNlbGYubWFwKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBkZWphbW9zIGFiaWVydGEgbnVlc3RyYSBiYXNlIGRlIGRhdG9zXHJcbiAgbGV0IHJlcXVlc3QgPSB3aW5kb3cuaW5kZXhlZERCLm9wZW4oXCJyZXN0YXVyYW50cy1qc29uXCIsIDEpO1xyXG5cclxuICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgYWxlcnQoXCJXaHkgZGlkbid0IHlvdSBhbGxvdyBteSB3ZWIgYXBwIHRvIHVzZSBJbmRleGVkREI/IVwiKTtcclxuICB9O1xyXG4gIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIERCSGVscGVyLmRiID0gcmVxdWVzdC5yZXN1bHQ7XHJcblxyXG4gICAgZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCgoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XHJcbiAgICAgICAgICB6b29tOiAxNixcclxuICAgICAgICAgIGNlbnRlcjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgICAgICBzY3JvbGx3aGVlbDogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZmlsbEJyZWFkY3J1bWIoKTtcclxuICAgICAgICBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHNlbGYucmVzdGF1cmFudCwgc2VsZi5tYXApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBEQkhlbHBlci5kYi5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgLy8gR2VuZXJpYyBlcnJvciBoYW5kbGVyIGZvciBhbGwgZXJyb3JzIHRhcmdldGVkIGF0IHRoaXMgZGF0YWJhc2Unc1xyXG4gICAgICAvLyByZXF1ZXN0cyFcclxuICAgICAgYWxlcnQoXCJEYXRhYmFzZSBlcnJvcjogXCIgKyBldmVudC50YXJnZXQuZXJyb3JDb2RlKTtcclxuICAgIH07XHJcbiAgfTtcclxuXHJcbiAgLy8gRXN0ZSBldmVudG8gc29sYW1lbnRlIGVzdMOhIGltcGxlbWVudGFkbyBlbiBuYXZlZ2Fkb3JlcyByZWNpZW50ZXNcclxuICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICB2YXIgZGIgPSBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gYWxtYWPDqW4gcGFyYSBjb250ZW5lciBsYSBpbmZvcm1hY2nDs24gZGUgbnVlc3Ryb3MgY2xpZW50ZVxyXG4gICAgLy8gU2UgdXNhcsOhIFwic3NuXCIgY29tbyBjbGF2ZSB5YSBxdWUgZXMgZ2FyYW50aXphZG8gcXVlIGVzIMO6bmljYVxyXG4gICAgdmFyIG9iamVjdFN0b3JlID0gZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJyZXN0YXVyYW50c1wiLCB7XHJcbiAgICAgIGtleVBhdGg6IFwiaWRcIlxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biDDrW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzcG9yIHZlY2luZGFyaW8uLlxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJuZWlnaGJvcmhvb2RcIiwgXCJuZWlnaGJvcmhvb2RcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGluZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlcyBwb3IgdGlwbyBkZSBjb2NpbmFcclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwiY3Vpc2luZV90eXBlXCIsIFwiY3Vpc2luZV90eXBlXCIsIHtcclxuICAgICAgdW5pcXVlOiBmYWxzZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biDDrW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzcG9yIHZlY2luZGFyaW8uLlxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJuZWlnaGJvcmhvb2QtY3Vpc2luZV90eXBlXCIsIFtcIm5laWdoYm9yaG9vZFwiLCBcImN1aXNpbmVfdHlwZVwiXSwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICAvLyBkZWphbW9zIGFiaWVydGEgbnVlc3RyYSBiYXNlIGRlIGRhdG9zXHJcbiAgbGV0IHJlcXVlc3QyID0gd2luZG93LmluZGV4ZWREQi5vcGVuKFwicmV2aWV3cy1qc29uXCIsIDEpO1xyXG5cclxuICByZXF1ZXN0Mi5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIGFsZXJ0KFwiV2h5IGRpZG4ndCB5b3UgYWxsb3cgbXkgd2ViIGFwcCB0byB1c2UgSW5kZXhlZERCPyFcIik7XHJcbiAgfTtcclxuICByZXF1ZXN0Mi5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgREJIZWxwZXIuZGIyID0gcmVxdWVzdDIucmVzdWx0O1xyXG5cclxuICAgIGZldGNoUmV2aWV3c0Zyb21VUkwoKTtcclxuXHJcbiAgICBEQkhlbHBlci5kYjIub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgIC8vIEdlbmVyaWMgZXJyb3IgaGFuZGxlciBmb3IgYWxsIGVycm9ycyB0YXJnZXRlZCBhdCB0aGlzIGRhdGFiYXNlJ3NcclxuICAgICAgLy8gcmVxdWVzdHMhXHJcbiAgICAgIGFsZXJ0KFwiRGF0YWJhc2UgZXJyb3I6IFwiICsgZXZlbnQudGFyZ2V0LmVycm9yQ29kZSk7XHJcbiAgICB9O1xyXG4gIH07XHJcblxyXG4gIC8vIEVzdGUgZXZlbnRvIHNvbGFtZW50ZSBlc3TDoSBpbXBsZW1lbnRhZG8gZW4gbmF2ZWdhZG9yZXMgcmVjaWVudGVzXHJcbiAgcmVxdWVzdDIub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBhbG1hY8OpbiBwYXJhIGNvbnRlbmVyIGxhIGluZm9ybWFjacOzbiBkZSBudWVzdHJvcyBjbGllbnRlXHJcbiAgICAvLyBTZSB1c2Fyw6EgXCJzc25cIiBjb21vIGNsYXZlIHlhIHF1ZSBlcyBnYXJhbnRpemFkbyBxdWUgZXMgw7puaWNhXHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShcInJldmlld3NcIiwge1xyXG4gICAgICBrZXlQYXRoOiBbXCJyZXN0YXVyYW50X2lkXCIsIFwibmFtZVwiLCBcImNyZWF0ZWRBdFwiLCBcInVwZGF0ZWRBdFwiXVxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gw61uZGljZSBwYXJhIGJ1c2NhciBjbGllbnRlc3BvciB2ZWNpbmRhcmlvLi5cclxuICAgIG9iamVjdFN0b3JlLmNyZWF0ZUluZGV4KFwicmVzdGF1cmFudF9pZFwiLCBcInJlc3RhdXJhbnRfaWRcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlldy1mb3JtJyk7XHJcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbihlKXtcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcihcIi4vanMvcG9zdFdvcmtlci5qc1wiKTtcclxuXHJcbiAgICB2YXIgdXNlcm5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgndXNlcm5hbWUnKVswXS52YWx1ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCd1c2VybmFtZScpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcbiAgICB2YXIgcmF0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3JhdGluZycpWzBdLnZhbHVlO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3JhdGluZycpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcbiAgICB2YXIgY29tbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdjb21tZW50JylbMF0udmFsdWU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnY29tbWVudCcpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcblxyXG4gICAgdmFyIGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xyXG4gICAgdmFyIG1lc3NhZ2UgPSB7XCJyZXN0YXVyYW50X2lkXCI6IHBhcnNlSW50KGlkKSwgXCJuYW1lXCI6IHVzZXJuYW1lLCBcImNyZWF0ZWRBdFwiOiBEYXRlLm5vdygpLCBcInVwZGF0ZWRBdFwiOiBEYXRlLm5vdygpLCBcInJhdGluZ1wiOiByYXRpbmcsIFwiY29tbWVudHNcIjogY29tbWVudCB9O1xyXG5cclxuICAgIHdvcmtlci5wb3N0TWVzc2FnZShtZXNzYWdlKTtcclxuXHJcbiAgICBhZGRSZXZpZXcobWVzc2FnZSk7XHJcblxyXG4gIH0pO1xyXG59XHJcblxyXG5hZGRSZXZpZXcgPSAobWVzc2FnZSkgPT4ge1xyXG5cclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcclxuXHJcbiAgdWwuYXBwZW5kQ2hpbGQoY3JlYXRlUmV2aWV3SFRNTChtZXNzYWdlKSk7XHJcblxyXG4gIGlmIChEQkhlbHBlci5kYjIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIyLnRyYW5zYWN0aW9uKFtcInJldmlld3NcIl0sIFwicmVhZHdyaXRlXCIpO1xyXG4gICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXZpZXdzXCIpO1xyXG5cclxuICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KG1lc3NhZ2UpO1xyXG4gICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgIH07XHJcbiAgXHJcbiAgfVxyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBjdXJyZW50IHJlc3RhdXJhbnQgZnJvbSBwYWdlIFVSTC5cclxuICovXHJcbmZldGNoUmVzdGF1cmFudEZyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcclxuICBpZiAoc2VsZi5yZXN0YXVyYW50KSB7IC8vIHJlc3RhdXJhbnQgYWxyZWFkeSBmZXRjaGVkIVxyXG4gICAgY2FsbGJhY2sobnVsbCwgc2VsZi5yZXN0YXVyYW50KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xyXG4gIGlmICghaWQpIHsgLy8gbm8gaWQgZm91bmQgaW4gVVJMXHJcbiAgICBlcnJvciA9ICdObyByZXN0YXVyYW50IGlkIGluIFVSTCdcclxuICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICB9IGVsc2Uge1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlJZChpZCwgKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XHJcbiAgICAgIHNlbGYucmVzdGF1cmFudCA9IHJlc3RhdXJhbnQ7XHJcbiAgICAgIGlmICghcmVzdGF1cmFudCkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBmaWxsUmVzdGF1cmFudEhUTUwoKTtcclxuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudClcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZmV0Y2hSZXZpZXdzRnJvbVVSTCA9IChjYWxsYmFjaykgPT4ge1xyXG4gIGlmIChzZWxmLnJldmlldykgeyAvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcclxuICAgIGNhbGxiYWNrKG51bGwsIHNlbGYucmV2aWV3KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xyXG4gIGlmICghaWQpIHsgLy8gbm8gaWQgZm91bmQgaW4gVVJMXHJcbiAgICBlcnJvciA9ICdObyByZXN0YXVyYW50IGlkIGluIFVSTCdcclxuICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICB9IGVsc2Uge1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXZpZXdSZXN0YXVyYW50QnlJZChpZCwgKGVycm9yLCByZXZpZXdzKSA9PiB7XHJcbiAgICAgICAgc2VsZi5yZXZpZXdzID0gcmV2aWV3cztcclxuICAgICAgICBpZiAoIXJldmlld3MpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBmaWxsIHJldmlld3NcclxuICAgICAgICBmaWxsUmV2aWV3c0hUTUwoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1uYW1lJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcblxyXG4gIGNvbnN0IGFkZHJlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1hZGRyZXNzJyk7XHJcbiAgYWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XHJcblxyXG4gIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaW1nJyk7XHJcbiAgaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcclxuICBpbWFnZS5zcmMgPSBEQkhlbHBlci5pbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgaW1hZ2UuYWx0ID0gcmVzdGF1cmFudC5uYW1lICsgJ1xcJ3MgaW1hZ2Ugc2hvd2luZyBzb21lIGRlbGljaXVzICcgKyByZXN0YXVyYW50LmN1aXNpbmVfdHlwZSArICcgZm9vZCBjb29ja2VkIGluICcgKyByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWN1aXNpbmUnKTtcclxuICBjdWlzaW5lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlO1xyXG5cclxuICAvLyBmaWxsIG9wZXJhdGluZyBob3Vyc1xyXG4gIGlmIChyZXN0YXVyYW50Lm9wZXJhdGluZ19ob3Vycykge1xyXG4gICAgZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBvcGVyYXRpbmcgaG91cnMgSFRNTCB0YWJsZSBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwgPSAob3BlcmF0aW5nSG91cnMgPSBzZWxmLnJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSA9PiB7XHJcbiAgY29uc3QgaG91cnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1ob3VycycpO1xyXG4gIGZvciAobGV0IGtleSBpbiBvcGVyYXRpbmdIb3Vycykge1xyXG4gICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcclxuXHJcbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xyXG4gICAgZGF5LmlubmVySFRNTCA9IGtleTtcclxuICAgIHJvdy5hcHBlbmRDaGlsZChkYXkpO1xyXG5cclxuICAgIGNvbnN0IHRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xyXG4gICAgdGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldO1xyXG4gICAgcm93LmFwcGVuZENoaWxkKHRpbWUpO1xyXG5cclxuICAgIGhvdXJzLmFwcGVuZENoaWxkKHJvdyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFsbCByZXZpZXdzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJldmlld3NIVE1MID0gKHJldmlld3MgPSBzZWxmLnJldmlld3MpID0+IHtcclxuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1jb250YWluZXInKTtcclxuXHJcbiAgaWYgKCFyZXZpZXdzKSB7XHJcbiAgICBjb25zdCBub1Jldmlld3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICBub1Jldmlld3MuaW5uZXJIVE1MID0gJ05vIHJldmlld3MgeWV0ISc7XHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobm9SZXZpZXdzKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XHJcbiAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiB7XHJcbiAgICB1bC5hcHBlbmRDaGlsZChjcmVhdGVSZXZpZXdIVE1MKHJldmlldykpO1xyXG4gIH0pO1xyXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh1bCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmV2aWV3IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmNyZWF0ZVJldmlld0hUTUwgPSAocmV2aWV3KSA9PiB7XHJcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG5cclxuICBjb25zdCBkaXZOYW1lRGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gIGRpdk5hbWVEYXRlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwidGl0bGUtZGF0ZS1kaXYgZmxleC1jb250YWluZXJcIik7XHJcblxyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXZpZXcubmFtZTtcclxuICBuYW1lLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LXRpdGxlXCIpO1xyXG4gIGRpdk5hbWVEYXRlLmFwcGVuZENoaWxkKG5hbWUpO1xyXG5cclxuICBjb25zdCBkYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGRhdGUuaW5uZXJIVE1MID0gbmV3IERhdGUocmV2aWV3LnVwZGF0ZWRBdCkudG9VVENTdHJpbmcoKTtcclxuICBkYXRlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LWRhdGVcIik7XHJcbiAgZGl2TmFtZURhdGUuYXBwZW5kQ2hpbGQoZGF0ZSk7XHJcblxyXG4gIGxpLmFwcGVuZENoaWxkKGRpdk5hbWVEYXRlKTtcclxuXHJcbiAgY29uc3QgZGl2UmF0aW5nQ29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBkaXZSYXRpbmdDb21tZW50cy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJhdGluZy1jb21tZW50LWRpdlwiKTtcclxuXHJcbiAgY29uc3QgcmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIHJhdGluZy5pbm5lckhUTUwgPSBgUmF0aW5nOiAke3Jldmlldy5yYXRpbmd9YDtcclxuICByYXRpbmcuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctcmF0aW5nXCIpO1xyXG4gIGRpdlJhdGluZ0NvbW1lbnRzLmFwcGVuZENoaWxkKHJhdGluZyk7XHJcblxyXG4gIGNvbnN0IGNvbW1lbnREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBpZiAocmV2aWV3LmNvbW1lbnRzLmxlbmd0aCA+IE1BWF9URVhUX0xFTkdUSCkge1xyXG4gICAgY29uc3Qgc25pcGV0VGV4dCA9IHJldmlldy5jb21tZW50cy5zdWJzdHJpbmcoMCwgTUFYX1RFWFRfTEVOR1RIKSArIFwiLi4uXCI7XHJcbiAgICBjb25zdCBzbmlwZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICBzbmlwZXQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctc25pcGV0XCIpO1xyXG4gICAgc25pcGV0LmlubmVySFRNTCA9IHNuaXBldFRleHQ7XHJcbiAgICBjb21tZW50RGl2LmFwcGVuZENoaWxkKHNuaXBldCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBjb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBjb21tZW50cy5pbm5lckhUTUwgPSByZXZpZXcuY29tbWVudHM7XHJcbiAgY29tbWVudHMuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctdGV4dFwiKTtcclxuICBpZiAocmV2aWV3LmNvbW1lbnRzLmxlbmd0aCA+IE1BWF9URVhUX0xFTkdUSClcclxuICAgIGNvbW1lbnRzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgY29tbWVudERpdi5hcHBlbmRDaGlsZChjb21tZW50cyk7XHJcblxyXG4gIGlmIChyZXZpZXcuY29tbWVudHMubGVuZ3RoID4gTUFYX1RFWFRfTEVOR1RIKSB7XHJcbiAgICBjb25zdCBkaXNwbGF5QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XHJcbiAgICBkaXNwbGF5QnV0dG9uLmlubmVySFRNTCA9IFwiU2VlIG1vcmUuLi5cIjtcclxuICAgIGRpc3BsYXlCdXR0b24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJkaXNwbGF5LWJ1dHRvblwiKTtcclxuICAgIGRpc3BsYXlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAodGhpcy5pbm5lckhUTUwgPT09IFwiU2VlIG1vcmUuLi5cIikge1xyXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJTZWUgbGVzcy4uLlwiO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICB0aGlzLnByZXZpb3VzRWxlbWVudFNpYmxpbmcucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJTZWUgbW9yZS4uLlwiO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIGNvbW1lbnREaXYuYXBwZW5kQ2hpbGQoZGlzcGxheUJ1dHRvbik7XHJcbiAgfVxyXG5cclxuICBkaXZSYXRpbmdDb21tZW50cy5hcHBlbmRDaGlsZChjb21tZW50RGl2KTtcclxuXHJcbiAgbGkuYXBwZW5kQ2hpbGQoZGl2UmF0aW5nQ29tbWVudHMpO1xyXG5cclxuICByZXR1cm4gbGk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgcmVzdGF1cmFudCBuYW1lIHRvIHRoZSBicmVhZGNydW1iIG5hdmlnYXRpb24gbWVudVxyXG4gKi9cclxuZmlsbEJyZWFkY3J1bWIgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IGJyZWFkY3J1bWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJlYWRjcnVtYicpO1xyXG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICBsaS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcbiAgYnJlYWRjcnVtYi5hcHBlbmRDaGlsZChsaSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgYSBwYXJhbWV0ZXIgYnkgbmFtZSBmcm9tIHBhZ2UgVVJMLlxyXG4gKi9cclxuZ2V0UGFyYW1ldGVyQnlOYW1lID0gKG5hbWUsIHVybCkgPT4ge1xyXG4gIGlmICghdXJsKVxyXG4gICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbiAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW1xcXV0vZywgJ1xcXFwkJicpO1xyXG4gIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgWz8mXSR7bmFtZX0oPShbXiYjXSopfCZ8I3wkKWApLFxyXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcclxuICBpZiAoIXJlc3VsdHMpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuICBpZiAoIXJlc3VsdHNbMl0pXHJcbiAgICByZXR1cm4gJyc7XHJcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzJdLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcclxufSIsInJlZ2lzdGVyU1coKTtcclxuXHJcbmZ1bmN0aW9uIHJlZ2lzdGVyU1coKSB7XHJcbiAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJy9qcy9zdy5qcycpLnRoZW4oZnVuY3Rpb24gKHJlZykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWcud2FpdGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVnLmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZWZvdW5kJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlZnJlc2hpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2hpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxudXBkYXRlUmVhZHkgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBhY3Rpb246ICdza2lwV2FpdGluZycgfSk7XHJcbn07XHJcblxyXG50cmFja0luc3RhbGxpbmcgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PSAnaW5zdGFsbGVkJykge1xyXG4gICAgICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59OyJdfQ==
