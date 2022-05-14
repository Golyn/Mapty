'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  // Getting the last 10 characters of the current timestamp as the id
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    console.log(this.date.getDate);
  }

  click() {
    this.clicks++;
  }
}
// Child Classes of the Workout Class
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  // Method for calculating the pace
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  // Method for calculating the speed
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Instantiating objects
// const run1 = new Running([35, -53.56], 3, 16, 25);
// const cycl1 = new Cycling([35, -53.56], 9, 3.5, 10);
// console.log(run1, cycl1);

//////APPLICATION ARCHITECTURE
class App {
  // Private class fields / properties
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];

  // The constructor is immediately called when the an object is instantiated
  constructor() {
    // Get user's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();

    // Listening for submit even when enter is clicked on the form
    // NB: Event handler functions eg."this._newWorkout" will always have or the "this" keyword
    // of the DOM element onto which it is attached and point to it, in this case the form element  instead of the app
    // object itself. So we need to fix it using the bind() method
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Listening for a change event on the input type
    // and displaying or hiding the fields depending on which input type is selected
    inputType.addEventListener('change', this._toggleElevation);
    containerWorkouts.addEventListener('click', this._moveToPoppup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      // NB: Since the callback fxn below treats "this._loadMap" as a regular fxn call not as a method call and
      // for regular fxn calls the "this" keyword is set to undefine hence we use the bind()
      // method to manually bind the "this" keyword to whatever we need
      // in this case the "this._loadMap" ,hence it becomes "this._loadMap.bind(this)"
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Couldn't get the location");
        }
      );
  }

  _loadMap(position) {
    // console.log(this);
    // Getting the lat and long coordinates
    const { latitude, longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Adding event handler using leaflet's handler
    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // Displaying the form when there is a click event on the map
    form.classList.remove('hidden');
    // focusing the cursor on the distance input field
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevation() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Submitting the form a new workout creates a new workout
  _newWorkout(e) {
    e.preventDefault();
    // Helper functions to for data validation
    // Converts the inputs into an array using the rest operator and the iterate it
    // boolean true is returned if the inputs are finite.
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every(inp => inp > 0);
    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value; //NB: the input values strings by default so
    // it has to be converted into Number using the + operator/keyword
    const duration = +inputDuration.value;

    // Getting the coordinates when there is any click event on the map
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    // Selecting workout type
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Data validation
      // Check if data is valid positive number
      if (
        !validInputs(cadence, distance, duration) ||
        !allPositives(cadence, distance, duration)
      )
        // else return the alert
        return alert('Inputs have to be positive numbers!');
      // Create running object
      workout = new Running([lat, lng], distance, duration, cadence);
      // console.log(workout);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(elevation, distance, duration) ||
        !allPositives(duration, distance)
        // NB: elevation gain can be a negative value hence it isnt validated with the allPositives function
      )
        return alert('Inputs have to be positive numbers!');
      // Create cycling object
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Calling the methods
    // Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Creating and adding the marker to the map
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
  `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPoppup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface
    // workout.click();
  }

  //Setting local storage using the local storage API
  _setLocalStorage() {
    // JSON.stringify is used to convert any object to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    // Guard clause: For error catching
    if (!data) return;

    // Restoring the data across multiple reloads of the page
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Removing the workout data from local storage and reloading the app
  // Public method
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
// Creating or instantiatinig app object from the class App
const app = new App();
