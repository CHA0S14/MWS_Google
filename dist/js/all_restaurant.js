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
      var objectStore = transaction.objectStore("reviews");
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
    DBHelper.getReviewsFromApi(url, callback);
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

var id;

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  id = getParameterByName('id');
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyX3Jlc3RhdXJhbnQuanMiLCJyZXN0YXVyYW50X2luZm8uanMiLCJzd1JlZ2lzdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWxsX3Jlc3RhdXJhbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIENvbW1vbiBkYXRhYmFzZSBoZWxwZXIgZnVuY3Rpb25zLlxyXG4gKi9cclxuY2xhc3MgREJIZWxwZXIge1xyXG4gIC8qKlxyXG4gICAqIERhdGFiYXNlIFVSTC5cclxuICAgKiBDaGFuZ2UgdGhpcyB0byByZXN0YXVyYW50cy5qc29uIGZpbGUgbG9jYXRpb24gb24geW91ciBzZXJ2ZXIuXHJcbiAgICovXHJcbiAgc3RhdGljIGdldCBEQVRBQkFTRV9VUkwoKSB7XHJcbiAgICBjb25zdCBwb3J0ID0gMTMzNzsgLy8gQ2hhbmdlIHRoaXMgdG8geW91ciBzZXJ2ZXIgcG9ydFxyXG4gICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vcmVzdGF1cmFudHNgO1xyXG4gIH1cclxuICBzdGF0aWMgZ2V0IFJFVklFV19VUkwoKSB7XHJcbiAgICBjb25zdCBwb3J0ID0gMTMzNzsgLy8gQ2hhbmdlIHRoaXMgdG8geW91ciBzZXJ2ZXIgcG9ydFxyXG4gICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vcmV2aWV3cy8/cmVzdGF1cmFudF9pZD1gO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGdldFJlc3RhdXJhbnRGcm9tQXBpKHVybCwgY2FsbGJhY2spIHtcclxuICAgIHZhciByZXN0YXVyYW50RGF0YSA9IGZldGNoKHVybClcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICBpZiAoREJIZWxwZXIuZGIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0sIFwicmVhZHdyaXRlXCIpO1xyXG4gICAgICAgICAgdmFyIG9iamVjdFN0b3JlID0gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoXCJyZXN0YXVyYW50c1wiKTtcclxuXHJcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNwb25zZSkpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiByZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gb2JqZWN0U3RvcmUucHV0KHJlc3BvbnNlW2ldKTtcclxuICAgICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLnB1dChyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvdWxkbnQgYmUgYWRkZWRcIilcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcclxuICAgICAgfSlcclxuICAgICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSAoYFJlcXVlc3QgZmFpbGVkLiAke2V9YCk7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBnZXRSZXZpZXdzRnJvbUFwaSh1cmwsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcmVzdGF1cmFudERhdGEgPSBmZXRjaCh1cmwpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgaWYgKERCSGVscGVyLmRiMiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYjIudHJhbnNhY3Rpb24oW1wicmV2aWV3c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICAgICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJldmlld3NcIik7XHJcblxyXG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UpKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICBkZWxldGUgcmVzcG9uc2VbaV0uaWQ7XHJcbiAgICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2VbaV0pO1xyXG4gICAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSByZXNwb25zZS5pZDtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb3VsZG50IGJlIGFkZGVkXCIpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gJHtlfWApO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhIHJlc3RhdXJhbnQgYnkgaXRzIElELlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHVybCA9IERCSGVscGVyLkRBVEFCQVNFX1VSTCArIGAvJHtpZH1gO1xyXG4gICAgaWYgKERCSGVscGVyLmRiICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIHRyYW5zYWN0aW9uID0gREJIZWxwZXIuZGIudHJhbnNhY3Rpb24oW1wicmVzdGF1cmFudHNcIl0pO1xyXG4gICAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIpO1xyXG4gICAgICB2YXIgcmVxdWVzdCA9IG9iamVjdFN0b3JlLmdldChpZCk7XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcblxyXG4gICAgICAgIGlmKHJlcXVlc3QucmVzdWx0ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJObyByZXN0YXVyYW50IGZvdW5kXCIsIG51bGwpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgIERCSGVscGVyLmdldFJlc3RhdXJhbnRGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXZpZXdSZXN0YXVyYW50QnlJZChpZCwgY2FsbGJhY2spIHtcclxuICAgIHZhciB1cmwgPSBEQkhlbHBlci5SRVZJRVdfVVJMICsgYCR7aWR9YDtcclxuICAgIGlmIChEQkhlbHBlci5kYjIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYjIudHJhbnNhY3Rpb24oW1wicmV2aWV3c1wiXSk7XHJcbiAgICAgIHZhciBvYmplY3RTdG9yZSA9IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKFwicmV2aWV3c1wiKTtcclxuICAgICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5nZXQoaWQpO1xyXG5cclxuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIGlmKHJlcXVlc3QucmVzdWx0ID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgY2FsbGJhY2soXCJObyByZXN0YXVyYW50IGZvdW5kXCIsIG51bGwpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdC5yZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIFJlcXVlc3QgdG8gYXBpIHRvIHVwZGF0ZSBpbmRleGVkREJcclxuICAgIERCSGVscGVyLmdldFJldmlld3NGcm9tQXBpKHVybCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBwYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgdXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAuL3Jlc3RhdXJhbnQuaHRtbD9pZD0ke3Jlc3RhdXJhbnQuaWR9YCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXN0YXVyYW50IGltYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpIHtcclxuICAgIHJldHVybiAoYC9pbWcvJHtyZXN0YXVyYW50LnBob3RvZ3JhcGh9LmpwZ2ApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTWFwIG1hcmtlciBmb3IgYSByZXN0YXVyYW50LlxyXG4gICAqL1xyXG4gIHN0YXRpYyBtYXBNYXJrZXJGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIG1hcCkge1xyXG4gICAgY29uc3QgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgIHBvc2l0aW9uOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgdGl0bGU6IHJlc3RhdXJhbnQubmFtZSxcclxuICAgICAgdXJsOiBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpLFxyXG4gICAgICBtYXA6IG1hcCxcclxuICAgICAgYW5pbWF0aW9uOiBnb29nbGUubWFwcy5BbmltYXRpb24uRFJPUFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG4gIH1cclxuXHJcbn0iLCJsZXQgcmVzdGF1cmFudDtcclxubGV0IHJldmlld3M7XHJcbnZhciBtYXA7XHJcbmNvbnN0IE1BWF9URVhUX0xFTkdUSCA9IDQwMDtcclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcclxuXHJcbiAgdmFyIGluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93Lm1vekluZGV4ZWREQiB8fCB3aW5kb3cud2Via2l0SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQiB8fCB3aW5kb3cuc2hpbUluZGV4ZWREQjtcclxuXHJcbiAgaWYgKCF3aW5kb3cuaW5kZXhlZERCKSB7XHJcbiAgICB3aW5kb3cuYWxlcnQoXCJTdSBuYXZlZ2Fkb3Igbm8gc29wb3J0YSB1bmEgdmVyc2nDs24gZXN0YWJsZSBkZSBpbmRleGVkREIuIFRhbCB5IGNvbW8gbGFzIGNhcmFjdGVyw61zdGljYXMgbm8gc2Vyw6FuIHZhbGlkYXNcIik7XHJcblxyXG4gICAgZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCgoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XHJcbiAgICAgICAgICB6b29tOiAxNixcclxuICAgICAgICAgIGNlbnRlcjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgICAgICBzY3JvbGx3aGVlbDogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZmlsbEJyZWFkY3J1bWIoKTtcclxuICAgICAgICBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHNlbGYucmVzdGF1cmFudCwgc2VsZi5tYXApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGRlamFtb3MgYWJpZXJ0YSBudWVzdHJhIGJhc2UgZGUgZGF0b3NcclxuICBsZXQgcmVxdWVzdCA9IHdpbmRvdy5pbmRleGVkREIub3BlbihcInJlc3RhdXJhbnRzLWpzb25cIiwgMSk7XHJcblxyXG4gIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBhbGVydChcIldoeSBkaWRuJ3QgeW91IGFsbG93IG15IHdlYiBhcHAgdG8gdXNlIEluZGV4ZWREQj8hXCIpO1xyXG4gIH07XHJcbiAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgREJIZWxwZXIuZGIgPSByZXF1ZXN0LnJlc3VsdDtcclxuXHJcbiAgICBmZXRjaFJlc3RhdXJhbnRGcm9tVVJMKChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgICAgICAgIHpvb206IDE2LFxyXG4gICAgICAgICAgY2VudGVyOiByZXN0YXVyYW50LmxhdGxuZyxcclxuICAgICAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmaWxsQnJlYWRjcnVtYigpO1xyXG4gICAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIERCSGVscGVyLmRiLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAvLyBHZW5lcmljIGVycm9yIGhhbmRsZXIgZm9yIGFsbCBlcnJvcnMgdGFyZ2V0ZWQgYXQgdGhpcyBkYXRhYmFzZSdzXHJcbiAgICAgIC8vIHJlcXVlc3RzIVxyXG4gICAgICBhbGVydChcIkRhdGFiYXNlIGVycm9yOiBcIiArIGV2ZW50LnRhcmdldC5lcnJvckNvZGUpO1xyXG4gICAgfTtcclxuICB9O1xyXG5cclxuICAvLyBFc3RlIGV2ZW50byBzb2xhbWVudGUgZXN0w6EgaW1wbGVtZW50YWRvIGVuIG5hdmVnYWRvcmVzIHJlY2llbnRlc1xyXG4gIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIHZhciBkYiA9IGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblxyXG4gICAgLy8gU2UgY3JlYSB1biBhbG1hY8OpbiBwYXJhIGNvbnRlbmVyIGxhIGluZm9ybWFjacOzbiBkZSBudWVzdHJvcyBjbGllbnRlXHJcbiAgICAvLyBTZSB1c2Fyw6EgXCJzc25cIiBjb21vIGNsYXZlIHlhIHF1ZSBlcyBnYXJhbnRpemFkbyBxdWUgZXMgw7puaWNhXHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSBkYi5jcmVhdGVPYmplY3RTdG9yZShcInJlc3RhdXJhbnRzXCIsIHtcclxuICAgICAga2V5UGF0aDogXCJpZFwiXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZFwiLCBcIm5laWdoYm9yaG9vZFwiLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlIGNyZWEgdW4gaW5kaWNlIHBhcmEgYnVzY2FyIGNsaWVudGVzIHBvciB0aXBvIGRlIGNvY2luYVxyXG4gICAgb2JqZWN0U3RvcmUuY3JlYXRlSW5kZXgoXCJjdWlzaW5lX3R5cGVcIiwgXCJjdWlzaW5lX3R5cGVcIiwge1xyXG4gICAgICB1bmlxdWU6IGZhbHNlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIMOtbmRpY2UgcGFyYSBidXNjYXIgY2xpZW50ZXNwb3IgdmVjaW5kYXJpby4uXHJcbiAgICBvYmplY3RTdG9yZS5jcmVhdGVJbmRleChcIm5laWdoYm9yaG9vZC1jdWlzaW5lX3R5cGVcIiwgW1wibmVpZ2hib3Job29kXCIsIFwiY3Vpc2luZV90eXBlXCJdLCB7XHJcbiAgICAgIHVuaXF1ZTogZmFsc2VcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIC8vIGRlamFtb3MgYWJpZXJ0YSBudWVzdHJhIGJhc2UgZGUgZGF0b3NcclxuICBsZXQgcmVxdWVzdDIgPSB3aW5kb3cuaW5kZXhlZERCLm9wZW4oXCJyZXZpZXdzLWpzb25cIiwgMSk7XHJcblxyXG4gIHJlcXVlc3QyLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgYWxlcnQoXCJXaHkgZGlkbid0IHlvdSBhbGxvdyBteSB3ZWIgYXBwIHRvIHVzZSBJbmRleGVkREI/IVwiKTtcclxuICB9O1xyXG4gIHJlcXVlc3QyLm9uc3VjY2VzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICBEQkhlbHBlci5kYjIgPSByZXF1ZXN0Mi5yZXN1bHQ7XHJcblxyXG4gICAgZmV0Y2hSZXZpZXdzRnJvbVVSTCgpO1xyXG5cclxuICAgIERCSGVscGVyLmRiMi5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgLy8gR2VuZXJpYyBlcnJvciBoYW5kbGVyIGZvciBhbGwgZXJyb3JzIHRhcmdldGVkIGF0IHRoaXMgZGF0YWJhc2Unc1xyXG4gICAgICAvLyByZXF1ZXN0cyFcclxuICAgICAgYWxlcnQoXCJEYXRhYmFzZSBlcnJvcjogXCIgKyBldmVudC50YXJnZXQuZXJyb3JDb2RlKTtcclxuICAgIH07XHJcbiAgfTtcclxuXHJcbiAgLy8gRXN0ZSBldmVudG8gc29sYW1lbnRlIGVzdMOhIGltcGxlbWVudGFkbyBlbiBuYXZlZ2Fkb3JlcyByZWNpZW50ZXNcclxuICByZXF1ZXN0Mi5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgdmFyIGRiID0gZXZlbnQudGFyZ2V0LnJlc3VsdDtcclxuXHJcbiAgICAvLyBTZSBjcmVhIHVuIGFsbWFjw6luIHBhcmEgY29udGVuZXIgbGEgaW5mb3JtYWNpw7NuIGRlIG51ZXN0cm9zIGNsaWVudGVcclxuICAgIC8vIFNlIHVzYXLDoSBcInNzblwiIGNvbW8gY2xhdmUgeWEgcXVlIGVzIGdhcmFudGl6YWRvIHF1ZSBlcyDDum5pY2FcclxuICAgIHZhciBvYmplY3RTdG9yZSA9IGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwicmV2aWV3c1wiLCB7XHJcbiAgICAgIGtleVBhdGg6IFtcInJlc3RhdXJhbnRfaWRcIiwgXCJuYW1lXCIsIFwiY3JlYXRlZEF0XCIsIFwidXBkYXRlZEF0XCJdXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlldy1mb3JtJyk7XHJcbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbihlKXtcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcihcIi4vanMvcG9zdFdvcmtlci5qc1wiKTtcclxuXHJcbiAgICB2YXIgdXNlcm5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgndXNlcm5hbWUnKVswXS52YWx1ZTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCd1c2VybmFtZScpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcbiAgICB2YXIgcmF0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3JhdGluZycpWzBdLnZhbHVlO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ3JhdGluZycpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcbiAgICB2YXIgY29tbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdjb21tZW50JylbMF0udmFsdWU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnY29tbWVudCcpWzBdLnZhbHVlID0gbnVsbDtcclxuXHJcbiAgICB2YXIgbWVzc2FnZSA9IHtcInJlc3RhdXJhbnRfaWRcIjogcGFyc2VJbnQoaWQpLCBcIm5hbWVcIjogdXNlcm5hbWUsIFwiY3JlYXRlZEF0XCI6IERhdGUubm93KCksIFwidXBkYXRlZEF0XCI6IERhdGUubm93KCksIFwicmF0aW5nXCI6IHJhdGluZywgXCJjb21tZW50c1wiOiBjb21tZW50IH07XHJcblxyXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuICAgIGFkZFJldmlldyhtZXNzYWdlKTtcclxuXHJcbiAgfSk7XHJcbn1cclxuXHJcbmFkZFJldmlldyA9IChtZXNzYWdlKSA9PiB7XHJcblxyXG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtbGlzdCcpO1xyXG5cclxuICB1bC5hcHBlbmRDaGlsZChjcmVhdGVSZXZpZXdIVE1MKG1lc3NhZ2UpKTtcclxuXHJcbiAgaWYgKERCSGVscGVyLmRiMiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICB2YXIgdHJhbnNhY3Rpb24gPSBEQkhlbHBlci5kYjIudHJhbnNhY3Rpb24oW1wicmV2aWV3c1wiXSwgXCJyZWFkd3JpdGVcIik7XHJcbiAgICB2YXIgb2JqZWN0U3RvcmUgPSB0cmFuc2FjdGlvbi5vYmplY3RTdG9yZShcInJldmlld3NcIik7XHJcblxyXG4gICAgdmFyIHJlcXVlc3QgPSBvYmplY3RTdG9yZS5wdXQobWVzc2FnZSk7XHJcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ291bGRudCBiZSBhZGRlZFwiKVxyXG4gICAgfTtcclxuICBcclxuICB9XHJcblxyXG59XHJcblxyXG52YXIgaWQ7XHJcblxyXG4vKipcclxuICogR2V0IGN1cnJlbnQgcmVzdGF1cmFudCBmcm9tIHBhZ2UgVVJMLlxyXG4gKi9cclxuZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCA9IChjYWxsYmFjaykgPT4ge1xyXG4gIGlmIChzZWxmLnJlc3RhdXJhbnQpIHsgLy8gcmVzdGF1cmFudCBhbHJlYWR5IGZldGNoZWQhXHJcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcclxuICBpZiAoIWlkKSB7IC8vIG5vIGlkIGZvdW5kIGluIFVSTFxyXG4gICAgZXJyb3IgPSAnTm8gcmVzdGF1cmFudCBpZCBpbiBVUkwnXHJcbiAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xyXG4gICAgICBzZWxmLnJlc3RhdXJhbnQgPSByZXN0YXVyYW50O1xyXG4gICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgZmlsbFJlc3RhdXJhbnRIVE1MKCk7XHJcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZldGNoUmV2aWV3c0Zyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcclxuICBpZiAoc2VsZi5yZXZpZXcpIHsgLy8gcmVzdGF1cmFudCBhbHJlYWR5IGZldGNoZWQhXHJcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJldmlldyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICghaWQpIHsgLy8gbm8gaWQgZm91bmQgaW4gVVJMXHJcbiAgICBlcnJvciA9ICdObyByZXN0YXVyYW50IGlkIGluIFVSTCdcclxuICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICB9IGVsc2Uge1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXZpZXdSZXN0YXVyYW50QnlJZChpZCwgKGVycm9yLCByZXZpZXdzKSA9PiB7XHJcbiAgICAgICAgc2VsZi5yZXZpZXdzID0gcmV2aWV3cztcclxuICAgICAgICBpZiAoIXJldmlld3MpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBmaWxsIHJldmlld3NcclxuICAgICAgICBmaWxsUmV2aWV3c0hUTUwoKTtcclxuICAgICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlXHJcbiAqL1xyXG5maWxsUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1uYW1lJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcblxyXG4gIGNvbnN0IGFkZHJlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1hZGRyZXNzJyk7XHJcbiAgYWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XHJcblxyXG4gIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaW1nJyk7XHJcbiAgaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcclxuICBpbWFnZS5zcmMgPSBEQkhlbHBlci5pbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCk7XHJcbiAgaW1hZ2UuYWx0ID0gcmVzdGF1cmFudC5uYW1lICsgJ1xcJ3MgaW1hZ2Ugc2hvd2luZyBzb21lIGRlbGljaXVzICcgKyByZXN0YXVyYW50LmN1aXNpbmVfdHlwZSArICcgZm9vZCBjb29ja2VkIGluICcgKyByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuXHJcbiAgY29uc3QgY3Vpc2luZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWN1aXNpbmUnKTtcclxuICBjdWlzaW5lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlO1xyXG5cclxuICAvLyBmaWxsIG9wZXJhdGluZyBob3Vyc1xyXG4gIGlmIChyZXN0YXVyYW50Lm9wZXJhdGluZ19ob3Vycykge1xyXG4gICAgZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBvcGVyYXRpbmcgaG91cnMgSFRNTCB0YWJsZSBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwgPSAob3BlcmF0aW5nSG91cnMgPSBzZWxmLnJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSA9PiB7XHJcbiAgY29uc3QgaG91cnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1ob3VycycpO1xyXG4gIGZvciAobGV0IGtleSBpbiBvcGVyYXRpbmdIb3Vycykge1xyXG4gICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcclxuXHJcbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xyXG4gICAgZGF5LmlubmVySFRNTCA9IGtleTtcclxuICAgIHJvdy5hcHBlbmRDaGlsZChkYXkpO1xyXG5cclxuICAgIGNvbnN0IHRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xyXG4gICAgdGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldO1xyXG4gICAgcm93LmFwcGVuZENoaWxkKHRpbWUpO1xyXG5cclxuICAgIGhvdXJzLmFwcGVuZENoaWxkKHJvdyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGFsbCByZXZpZXdzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJldmlld3NIVE1MID0gKHJldmlld3MgPSBzZWxmLnJldmlld3MpID0+IHtcclxuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1jb250YWluZXInKTtcclxuXHJcbiAgaWYgKCFyZXZpZXdzKSB7XHJcbiAgICBjb25zdCBub1Jldmlld3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICBub1Jldmlld3MuaW5uZXJIVE1MID0gJ05vIHJldmlld3MgeWV0ISc7XHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobm9SZXZpZXdzKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XHJcbiAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiB7XHJcbiAgICB1bC5hcHBlbmRDaGlsZChjcmVhdGVSZXZpZXdIVE1MKHJldmlldykpO1xyXG4gIH0pO1xyXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh1bCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgcmV2aWV3IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cclxuICovXHJcbmNyZWF0ZVJldmlld0hUTUwgPSAocmV2aWV3KSA9PiB7XHJcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG5cclxuICBjb25zdCBkaXZOYW1lRGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gIGRpdk5hbWVEYXRlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwidGl0bGUtZGF0ZS1kaXYgZmxleC1jb250YWluZXJcIik7XHJcblxyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgbmFtZS5pbm5lckhUTUwgPSByZXZpZXcubmFtZTtcclxuICBuYW1lLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LXRpdGxlXCIpO1xyXG4gIGRpdk5hbWVEYXRlLmFwcGVuZENoaWxkKG5hbWUpO1xyXG5cclxuICBjb25zdCBkYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIGRhdGUuaW5uZXJIVE1MID0gbmV3IERhdGUocmV2aWV3LnVwZGF0ZWRBdCkudG9VVENTdHJpbmcoKTtcclxuICBkYXRlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwicmV2aWV3LWRhdGVcIik7XHJcbiAgZGl2TmFtZURhdGUuYXBwZW5kQ2hpbGQoZGF0ZSk7XHJcblxyXG4gIGxpLmFwcGVuZENoaWxkKGRpdk5hbWVEYXRlKTtcclxuXHJcbiAgY29uc3QgZGl2UmF0aW5nQ29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBkaXZSYXRpbmdDb21tZW50cy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcInJhdGluZy1jb21tZW50LWRpdlwiKTtcclxuXHJcbiAgY29uc3QgcmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIHJhdGluZy5pbm5lckhUTUwgPSBgUmF0aW5nOiAke3Jldmlldy5yYXRpbmd9YDtcclxuICByYXRpbmcuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctcmF0aW5nXCIpO1xyXG4gIGRpdlJhdGluZ0NvbW1lbnRzLmFwcGVuZENoaWxkKHJhdGluZyk7XHJcblxyXG4gIGNvbnN0IGNvbW1lbnREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICBpZiAocmV2aWV3LmNvbW1lbnRzLmxlbmd0aCA+IE1BWF9URVhUX0xFTkdUSCkge1xyXG4gICAgY29uc3Qgc25pcGV0VGV4dCA9IHJldmlldy5jb21tZW50cy5zdWJzdHJpbmcoMCwgTUFYX1RFWFRfTEVOR1RIKSArIFwiLi4uXCI7XHJcbiAgICBjb25zdCBzbmlwZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XHJcbiAgICBzbmlwZXQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctc25pcGV0XCIpO1xyXG4gICAgc25pcGV0LmlubmVySFRNTCA9IHNuaXBldFRleHQ7XHJcbiAgICBjb21tZW50RGl2LmFwcGVuZENoaWxkKHNuaXBldCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBjb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBjb21tZW50cy5pbm5lckhUTUwgPSByZXZpZXcuY29tbWVudHM7XHJcbiAgY29tbWVudHMuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJyZXZpZXctdGV4dFwiKTtcclxuICBpZiAocmV2aWV3LmNvbW1lbnRzLmxlbmd0aCA+IE1BWF9URVhUX0xFTkdUSClcclxuICAgIGNvbW1lbnRzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgY29tbWVudERpdi5hcHBlbmRDaGlsZChjb21tZW50cyk7XHJcblxyXG4gIGlmIChyZXZpZXcuY29tbWVudHMubGVuZ3RoID4gTUFYX1RFWFRfTEVOR1RIKSB7XHJcbiAgICBjb25zdCBkaXNwbGF5QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XHJcbiAgICBkaXNwbGF5QnV0dG9uLmlubmVySFRNTCA9IFwiU2VlIG1vcmUuLi5cIjtcclxuICAgIGRpc3BsYXlCdXR0b24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJkaXNwbGF5LWJ1dHRvblwiKTtcclxuICAgIGRpc3BsYXlCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAodGhpcy5pbm5lckhUTUwgPT09IFwiU2VlIG1vcmUuLi5cIikge1xyXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJTZWUgbGVzcy4uLlwiO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICB0aGlzLnByZXZpb3VzRWxlbWVudFNpYmxpbmcucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJTZWUgbW9yZS4uLlwiO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMucHJldmlvdXNFbGVtZW50U2libGluZy5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIGNvbW1lbnREaXYuYXBwZW5kQ2hpbGQoZGlzcGxheUJ1dHRvbik7XHJcbiAgfVxyXG5cclxuICBkaXZSYXRpbmdDb21tZW50cy5hcHBlbmRDaGlsZChjb21tZW50RGl2KTtcclxuXHJcbiAgbGkuYXBwZW5kQ2hpbGQoZGl2UmF0aW5nQ29tbWVudHMpO1xyXG5cclxuICByZXR1cm4gbGk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgcmVzdGF1cmFudCBuYW1lIHRvIHRoZSBicmVhZGNydW1iIG5hdmlnYXRpb24gbWVudVxyXG4gKi9cclxuZmlsbEJyZWFkY3J1bWIgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xyXG4gIGNvbnN0IGJyZWFkY3J1bWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJlYWRjcnVtYicpO1xyXG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICBsaS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XHJcbiAgYnJlYWRjcnVtYi5hcHBlbmRDaGlsZChsaSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgYSBwYXJhbWV0ZXIgYnkgbmFtZSBmcm9tIHBhZ2UgVVJMLlxyXG4gKi9cclxuZ2V0UGFyYW1ldGVyQnlOYW1lID0gKG5hbWUsIHVybCkgPT4ge1xyXG4gIGlmICghdXJsKVxyXG4gICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbiAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW1xcXV0vZywgJ1xcXFwkJicpO1xyXG4gIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgWz8mXSR7bmFtZX0oPShbXiYjXSopfCZ8I3wkKWApLFxyXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcclxuICBpZiAoIXJlc3VsdHMpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuICBpZiAoIXJlc3VsdHNbMl0pXHJcbiAgICByZXR1cm4gJyc7XHJcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzJdLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcclxufSIsInJlZ2lzdGVyU1coKTtcclxuXHJcbmZ1bmN0aW9uIHJlZ2lzdGVyU1coKSB7XHJcbiAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJy9qcy9zdy5qcycpLnRoZW4oZnVuY3Rpb24gKHJlZykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWcud2FpdGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVJlYWR5KHJlZy53YWl0aW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZy5pbnN0YWxsaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tJbnN0YWxsaW5nKHJlZy5pbnN0YWxsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVnLmFkZEV2ZW50TGlzdGVuZXIoJ3VwZGF0ZWZvdW5kJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNrSW5zdGFsbGluZyhyZWcuaW5zdGFsbGluZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdjb250cm9sbGVyY2hhbmdlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlZnJlc2hpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2hpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxudXBkYXRlUmVhZHkgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBhY3Rpb246ICdza2lwV2FpdGluZycgfSk7XHJcbn07XHJcblxyXG50cmFja0luc3RhbGxpbmcgPSBmdW5jdGlvbiAod29ya2VyKSB7XHJcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignc3RhdGVjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHdvcmtlci5zdGF0ZSA9PSAnaW5zdGFsbGVkJykge1xyXG4gICAgICAgICAgICB1cGRhdGVSZWFkeSh3b3JrZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59OyJdfQ==
