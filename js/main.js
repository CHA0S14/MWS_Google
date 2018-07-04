let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {


  fetchNeighborhoods();
  fetchCuisines();

});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

  if (!window.indexedDB) {
    window.alert("Su navegador no soporta una versión estable de indexedDB. Tal y como las características no serán validas");
    updateRestaurants();
  }

  // dejamos abierta nuestra base de datos
  let request = window.indexedDB.open("restaurants-json", 1);

  request.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request.onsuccess = function(event) {
    DBHelper.db = request.result;

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
  let request2 = window.indexedDB.open("favourites", 1);

  request2.onerror = function(event) {
    alert("Why didn't you allow my web app to use IndexedDB?!");
  };
  request2.onsuccess = function(event) {
    DBHelper.db2 = request2.result;

    updateRestaurants();

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
    var objectStore = db.createObjectStore("favourites", {
      keyPath: "restaurant_id"
    });
  };
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');

  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + '\'s image';
  li.append(image);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', "Clic to view more information and reviews of " + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const fav = document.createElement('a');
  fav.id = restaurant.id;

  var transaction = DBHelper.db2.transaction(["favourites"], "readwrite");
  var objectStore = transaction.objectStore("favourites");
  var id = parseInt(restaurant.id);
  var request = objectStore.get(id);

  request.onsuccess = function(event) {
    if(request.result === undefined){
      fav.innerHTML = '☆';
      objectStore.put({"restaurant_id":id, "fav":false});
    }else{
      if (!request.result.fav){
        fav.innerHTML = '☆';
      }else{
        fav.innerHTML = '★';
      }
    }
  };
    
  request.onerror = function(event) {
    console.log(request.result);
    fav.innerHTML = '☆';
  }

  fav.className="fav";
  fav.href = "#";

  fav.addEventListener("click",function(e){
    e.preventDefault();

    
    var transaction = DBHelper.db2.transaction(["favourites"], "readwrite");
    var objectStore = transaction.objectStore("favourites");
    var id = parseInt(fav.id);
    console.log(id);
    var request = objectStore.get(id);

    request.onsuccess = function(event) {
      if(request.result === undefined){
        fav.innerHTML = '☆';
        objectStore.put({"restaurant_id":id, "fav":false});
      }else{
        if (fav.innerHTML === '★'){
          fav.innerHTML = '☆';
          request.result.fav=false;
          objectStore.put(request.result);
        }else{
          request.result.fav=true;
          fav.innerHTML = '★';
          objectStore.put(request.result);
        }
      }
    };
      
    request.onerror = function(event) {
      console.log(request.result);
      fav.innerHTML = '☆';
    }
    
  });

  name.append(fav);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
}