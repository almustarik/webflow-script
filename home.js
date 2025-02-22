document.addEventListener('DOMContentLoaded', function () {
  const packageTypes = document.querySelectorAll('.package-type');
  const heightInput = document.querySelector('.height-input');
  const heightLabel = document.getElementById('height-label');
  const form = document.getElementById('shippingForm');
  const savingsSection = document.getElementById('savingsSection');
  const resultSection = document.getElementById('resultSection');
  const resultErrorSection = document.getElementById('resultErrorSection');
  const tabs = document.querySelectorAll('.tab');
  const localContainer = document.getElementById('localContainer');
  const internationalContainer = document.getElementById(
    'internationalContainer',
  );
  const steps = document.querySelectorAll('.step');
  const stepContents = document.querySelectorAll('.step-content');
  const internationalForm = document.getElementById(
    'internationalShippingForm',
  );
  let currentStep = 1;
  const formData = {
    step1: {},
    step2: {},
    step3: {},
  };

  const savingsData = [
    {
      name: 'DHL',
      title: 'DHL Express',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/67b01b0af67a8cad368fd9f6_DHL_Express_logo.png',
      fromLocation: 'San Francisco',
      toLocation: 'Austin Texas',
      originalPrice: 47.06,
      savedPrice: 11.77,
      savedPercentage: 75,
    },
    // More savings data here...
    {
      name: 'USPS',
      title: 'USPS Ground Advantage',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/67b01e6bed0166efc94c28a8_USPS_logo.png',
      fromLocation: 'Phoenix, Arizona',
      toLocation: 'Melbourne, Australia',
      originalPrice: 104.91,
      savedPrice: 22.03,
      savedPercentage: 79,
    },
    {
      name: 'FedEx',
      title: 'FedEx Standard Overnight',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/67b01d6957dcf729ab85446d_Fedex_logo.png',
      fromLocation: 'Philadelphia, United States',
      toLocation: 'Chihuahua, Mexico',
      originalPrice: 63.72,
      savedPrice: 10.83,
      savedPercentage: 83,
    },
  ];

  const API_URLS = {
    rateEstimate: 'https://rc.goshippo.com/ratings/estimate',
    // webhook: 'https://hook.eu2.make.com/jaohruuqta4lye7eo4ieqtr3ljbghmlc',
    webhook: 'https://hook.us2.make.com/iabjf8x5okv7te05wyeywr47oi4nk4cm',
    localHook: 'https://hook.us2.make.com/kskru6omra5gcjddbjhy0ba7dqingygk',
  };

  function validateStep(step) {
    const currentFields = stepContents[step - 1].querySelectorAll(
      'input[required], select[required]',
    );
    for (const field of currentFields) {
      if (!field.value.trim()) {
        toastr.warning(
          `Please fill in the "${field.dataset.label || 'required'}" field.`,
        );
        field.focus();
        return false;
      }
    }
    return true;
  }

  function captureStepData(step) {
    const currentFormFields =
      stepContents[step - 1].querySelectorAll('input, select');
    currentFormFields.forEach((field) => {
      const fieldName = field.name;
      const fieldValue = field.value;
      formData[`step${step}`][fieldName] = fieldValue;
    });

    if (step === steps.length) {
      console.log('All Steps Data:', formData);
    }
  }

  function updateStepper(step) {
    steps.forEach((s, index) => {
      s.classList.toggle('active', index + 1 === step);
    });
    stepContents.forEach((content, index) => {
      content.classList.toggle('active', index + 1 === step);
    });
  }

  document.querySelectorAll('.next-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < steps.length) {
        captureStepData(currentStep);
        currentStep++;
        updateStepper(currentStep);
      }
    });
  });

  document.querySelectorAll('.prev-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        updateStepper(currentStep);
      }
    });
  });

  internationalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    captureStepData(currentStep);
    toastr.info('Submitting data...', 'Processing');
    try {
      const response = await fetch(API_URLS.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Decode the ArrayBuffer to a string
      const decoder = new TextDecoder('utf-8');
      const decodedString = decoder.decode(arrayBuffer);

      // Parse the JSON string
      const data = JSON.parse(decodedString);

      console.log('Response Data:', data);

      const updatedData = data.map((item) => {
        const originalAmount = parseFloat(item.amount);
        const originalAmountLocal = parseFloat(item.amount_local);

        // Calculate 10% of the original amount
        const tenPercent = originalAmount * 0.6;
        const tenPercentLocal = originalAmountLocal * 0.6;

        // Create a new object with updated values
        return {
          ...item,
          amount: (originalAmount + tenPercent).toFixed(2),
          amount_local: (originalAmountLocal + tenPercentLocal).toFixed(2),
        };
      });

      console.log('Updated Response Data:', updatedData); // Log updated data
      // Handle the response data here
      displayResultsInternational(updatedData);
      toastr.success('Successfully received response!', 'Success');
    } catch (error) {
      toastr.error(`Error fetching rates: ${error.message}`);
      console.error('Error sending data to the webhook:', error);
      displayError();
    }
  });

  function displayResultsInternational(data) {
    // console.log({ internationalData: data });
    resultSection.innerHTML = `
    <div class="local-result-header">
      <h1 class="card-title" style="margin-bottom: 0 !important">Best Deals</h1>
      <span role="img" aria-label="fire">🔥</span>
    </div>
  `;

    if (data && data.length > 0) {
      const createCard = (rate, category) => `
      <div class="category">${category}</div>
      <div class="shipping-option">
        <img src="${rate.provider_image_75}" alt="${
        rate.provider
      }" class="logo" />
        <div class="details">
          <div class="company">${rate.provider} ${rate.servicelevel.name}</div>
          <div class="time">
            ${rate.estimated_days} ${rate.estimated_days === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div class="price-section">
          <div class="price">
            <div class="original-price">$${(rate.amount * 1.24).toFixed(
              2,
            )}</div>
            <div class="current-price">$${rate.amount}</div>
          </div>
          <button class="buy-button" onclick='navigateToOrder(${JSON.stringify(
            rate,
          )}, "international")'>Buy</button>
        </div>
      </div>
    `;

      ['FASTEST', 'CHEAPEST', 'BESTVALUE'].forEach((category) => {
        const rate = data.find((r) => r.attributes.includes(category));
        if (rate) {
          resultSection.innerHTML += createCard(rate, category);
        }
      });

      const otherRates = data.filter(
        (rate) =>
          !['FASTEST', 'CHEAPEST', 'BESTVALUE'].some((attr) =>
            rate.attributes.includes(attr),
          ),
      );

      if (otherRates.length) {
        resultSection.innerHTML += '<div class="category">Other Options</div>';
        otherRates.forEach((rate) => {
          resultSection.innerHTML += createCard(rate, '');
        });
      }
    } else {
      resultSection.innerHTML += '<p>No rates available.</p>';
    }

    savingsSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
  }

  updateStepper(currentStep);

  packageTypes.forEach((type) => {
    type.addEventListener('click', () => {
      packageTypes.forEach((t) => t.classList.remove('selected'));
      type.classList.add('selected');

      if (type.dataset.type === 'poly') {
        heightInput.classList.add('hidden');
        heightLabel.classList.add('hidden');
        heightInput.value = '0.5';
        heightInput.required = false;
      } else {
        heightInput.classList.remove('hidden');
        heightLabel.classList.remove('hidden');
        heightInput.value = '';
        heightInput.required = true;
      }
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      // Remove 'active' class from all tabs
      tabs.forEach((t) => t.classList.remove('active'));

      // Add 'active' class to the clicked tab
      tab.classList.add('active');

      // Toggle visibility of containers based on the clicked tab
      if (tab.dataset.tab === 'local') {
        localContainer.classList.remove('hidden');
        internationalContainer.classList.add('hidden');
      } else if (tab.dataset.tab === 'international') {
        internationalContainer.classList.remove('hidden');
        localContainer.classList.add('hidden');
      }
    });
  });

  const savingsList = document.querySelector('.savings-list');
  savingsData.forEach((item) => {
    const savingsItem = document.createElement('div');
    savingsItem.className = 'savings-item';
    savingsItem.innerHTML = `
      <div class="avatar">
          <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="savings-content">
          <div class="savings-header">
              <div class="user-info">
                  <h3>${item.name}</h3>
                  <p>${item.title}</p>
              </div>
              <div class="savings-amount">
                  <div class="savings-percentage">${
                    item.savedPercentage
                  }% Saved</div>
                  <div>
                      <span class="original-price">$${item.originalPrice.toFixed(
                        2,
                      )}</span>
                      <span class="new-price">$${item.savedPrice.toFixed(
                        2,
                      )}</span>
                  </div>
              </div>
          </div>
          <div class="location">
              <span>${item.fromLocation}</span>
              <span>→</span>
              <span>${item.toLocation}</span>
          </div>
      </div>
    `;
    savingsList.appendChild(savingsItem);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    captureLocalStepData(currentLocalStep);

    const payload = {
      zipcode_from: localFormData.step1.senderPostalCode,
      zipcode_to: localFormData.step1.receiverPostalCode,
      package_type: '',
      package_length: localFormData.step3.length,
      package_width: localFormData.step3.width,
      package_height: localFormData.step3.height,
      distance_unit: localFormData.step3.dimensionUnit,
      weight: localFormData.step3.weight,
      weight_unit: localFormData.step3.weightUnit,
    };

    toastr.info('Submitting data...', 'Processing');

    try {
      const payload = {
        localFormData,
        package_type: document.querySelector('.package-type.selected')?.dataset
          .type,
      };

      const response = await fetch(API_URLS.localHook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const decodedString = decoder.decode(arrayBuffer);
      const data = JSON.parse(decodedString);

      // console.log('Original Response Data:', data); // Log original data

      const updatedData = data.map((item) => {
        const originalAmount = parseFloat(item.amount);
        const originalAmountLocal = parseFloat(item.amount_local);

        // Calculate 10% of the original amount
        const tenPercent = originalAmount * 0.6;
        const tenPercentLocal = originalAmountLocal * 0.6;

        // Create a new object with updated values
        return {
          ...item,
          amount: (originalAmount + tenPercent).toFixed(2),
          amount_local: (originalAmountLocal + tenPercentLocal).toFixed(2),
        };
      });

      console.log('Updated Response Data:', updatedData); // Log updated data

      // Send the updated data to the displayResults function
      displayResults(updatedData);
      toastr.success('Successfully received response!', 'Success');
    } catch (error) {
      toastr.error(`Error fetching rates: ${error.message}`);
      console.error('Error:', error);
      displayError();
    }
  });

  function displayError() {
    savingsSection.classList.add('hidden');
    //<h1 class="card-title" style="margin-bottom: 0 !important">Error</h1>
    //    <span role="img" aria-label="fire">🔥</span>
    resultErrorSection.classList.remove('hidden');
    resultErrorSection.innerHTML = `
      <div class="error-container">
        <span class="error-label">ERROR</span>
        <h1 class="error-heading">
            <span>Oops!</span> That address doesn't look right.
        </h1>
        <p class="error-message">
            It seems the address you entered is invalid or incomplete. Please double-check the street, city, postal code, and country, and try again.
        </p>
        <button class="retry-button" onclick="window.location.reload()">
            Try Again
            <svg class="retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
            </svg>
        </button>
    </div>
  `;
  }

  function displayResults(data) {
    resultSection.innerHTML = `
    <div class="local-result-header">
      <h1 class="card-title" style="margin-bottom: 0 !important">Best Deals</h1>
      <span role="img" aria-label="fire">🔥</span>
    </div>
  `;

    if (data && data.length > 0) {
      const createCard = (rate, category) => `
      <div class="category">${category}</div>
      <div class="shipping-option">
        <img src="${rate.provider_image_75}" alt="${
        rate.provider
      }" class="logo" />
        <div class="details">
          <div class="company">${rate.provider} ${rate.servicelevel.name}</div>
          <div class="time">
            ${rate.estimated_days} ${rate.estimated_days === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div class="price-section">
          <div class="price">
            <div class="original-price">$${(rate.amount * 1.24).toFixed(
              2,
            )}</div>
            <div class="current-price">$${rate.amount}</div>
          </div>
          <button class="buy-button" onclick='navigateToOrder(${JSON.stringify(
            rate,
          )}, "local")'>Buy</button>
        </div>
      </div>
    `;

      ['FASTEST', 'CHEAPEST', 'BESTVALUE'].forEach((category) => {
        const rate = data.find((r) => r.attributes.includes(category));
        if (rate) {
          resultSection.innerHTML += createCard(rate, category);
        }
      });

      const otherRates = data.filter(
        (rate) =>
          !['FASTEST', 'CHEAPEST', 'BESTVALUE'].some((attr) =>
            rate.attributes.includes(attr),
          ),
      );

      if (otherRates.length) {
        resultSection.innerHTML += '<div class="category">Other Options</div>';
        otherRates.forEach((rate) => {
          resultSection.innerHTML += createCard(rate, '');
        });
      }
    } else {
      resultSection.innerHTML += '<p>No rates available.</p>';
    }

    savingsSection.classList.add('hidden');
    resultErrorSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
  }

  window.navigateToOrder = function (rate, type) {
    const queryParams = new URLSearchParams();
    const serializedRate = encodeURIComponent(JSON.stringify(rate));

    // Add rate for both local and international
    queryParams.append('rate', serializedRate);

    if (type === 'international') {
      // For international, add formData only
      queryParams.append('step1', JSON.stringify(formData.step1));
      queryParams.append('step2', JSON.stringify(formData.step2));
      queryParams.append('step3', JSON.stringify(formData.step3));
    } else {
      // For local, add only the shipping details
      queryParams.append('step1', JSON.stringify(localFormData.step1));
      queryParams.append('step2', JSON.stringify(localFormData.step2));
      queryParams.append('step3', JSON.stringify(localFormData.step3));
    }

    // Determine the correct URL based on type
    const url = type === 'international' ? 'international-order' : 'order';

    // Redirect to the appropriate URL
    window.location.href = `${url}?${queryParams.toString()}`;
  };

  const localSteps = document.querySelectorAll('.local-step');
  const localStepContents = document.querySelectorAll('.local-step-content');
  let currentLocalStep = 1;
  const localFormData = {
    step1: {},
    step2: {},
    step3: {},
  };

  function validateLocalStep(step) {
    const currentFields = localStepContents[step - 1].querySelectorAll(
      'input[required], select[required]',
    );
    for (const field of currentFields) {
      if (!field.value.trim()) {
        toastr.warning(
          `Please fill in the "${field.dataset.label || 'required'}" field.`,
        );
        field.focus();
        return false;
      }
    }
    return true;
  }

  function captureLocalStepData(step) {
    const currentFormFields =
      localStepContents[step - 1].querySelectorAll('input, select');
    currentFormFields.forEach((field) => {
      const fieldName = field.name;
      const fieldValue = field.value;
      localFormData[`step${step}`][fieldName] = fieldValue;
    });

    if (step === localSteps.length) {
      console.log('Local Steps Data:', localFormData);
    }
  }

  function updateLocalStepper(step) {
    localSteps.forEach((s, index) => {
      s.classList.toggle('active', index + 1 === step);
    });
    localStepContents.forEach((content, index) => {
      content.classList.toggle('active', index + 1 === step);
    });
  }

  document.querySelectorAll('.local-next-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateLocalStep(currentLocalStep)) return;
      if (currentLocalStep < localSteps.length) {
        captureLocalStepData(currentLocalStep);
        currentLocalStep++;
        updateLocalStepper(currentLocalStep);
      }
    });
  });

  document.querySelectorAll('.local-prev-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (currentLocalStep > 1) {
        currentLocalStep--;
        updateLocalStepper(currentLocalStep);
      }
    });
  });

  updateLocalStepper(currentLocalStep);
});
