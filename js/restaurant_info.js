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