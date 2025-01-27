document.addEventListener('DOMContentLoaded', function () {
  const packageTypes = document.querySelectorAll('.package-type');
  const heightInput = document.querySelector('.height-input');
  const heightLabel = document.getElementById('height-label');
  const form = document.getElementById('shippingForm');
  const savingsSection = document.getElementById('savingsSection');
  const resultSection = document.getElementById('resultSection');
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
      name: 'Adel ',
      title: 'CEO, Adel Management LLC',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/6771876b86aa61c0b54757d1_WhatsApp_Image_2024-11-20_at_11.03.36_4220eba8.jpg',
      fromLocation: 'Richmond, VA',
      toLocation: 'Beverly Hills, CA',
      originalPrice: 16.5,
      savedPrice: 8.2,
      savedPercentage: 80,
    },
    // More savings data here...
    {
      name: 'John Iskenderian',
      title: 'Head of Business, BRAVA 360 Digital',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/679642a74f5289b1ae43516a_1701958610858.jpeg',
      fromLocation: 'Richmond, VA',
      toLocation: 'Beverly Hills, CA',
      originalPrice: 16.5,
      savedPrice: 8.2,
      savedPercentage: 80,
    },
    {
      name: 'Will Houcheime',
      title: 'CEO, Sliq by Design',
      image:
        'https://cdn.prod.website-files.com/676e0b98edcce6b20ef67ef0/679642a779f5325b874d427e_1688454822337.jpeg',
      fromLocation: 'Richmond, VA',
      toLocation: 'Beverly Hills, CA',
      originalPrice: 16.5,
      savedPrice: 8.2,
      savedPercentage: 80,
    },
  ];

  const API_URLS = {
    rateEstimate: 'https://rc.goshippo.com/ratings/estimate',
    webhook: 'https://hook.eu2.make.com/jaohruuqta4lye7eo4ieqtr3ljbghmlc',
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

  internationalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    captureStepData(currentStep);

    fetch(API_URLS.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Response Data:', data);
      })
      .catch((error) => {
        console.error('Error sending data to the webhook:', error);
      });
  });

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
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

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

    const payload = {
      zipcode_from: document.getElementById('fromZip').value,
      zipcode_to: document.getElementById('toZip').value,
      // package_type: document.querySelector('.package-type.selected')?.dataset
      //   .type,
      package_type: '',
      package_length: document.getElementById('length').value,
      package_width: document.getElementById('width').value,
      package_height: document.getElementById('height').value,
      distance_unit: document.getElementById('dimensionUnit').value,
      weight: document.getElementById('weight').value,
      weight_unit: document.getElementById('weightUnit').value,
    };

    try {
      const response = await fetch(API_URLS.rateEstimate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      displayResults(data);
    } catch (error) {
      toastr.error(`Error fetching rates: ${error.message}`);
      console.error('Error:', error);
    }
  });

  function displayResults(data) {
    resultSection.innerHTML = `
      <div class="local-result-header">
        <h1 class="card-title" style="margin-bottom: 0 !important">Best Deals</h1>
        <span role="img" aria-label="fire">🔥</span>
      </div>
    `;

    if (data && data.rates?.length) {
      const createCard = (rate, category) => `
        <div class="category">${category}</div>
        <div class="shipping-option">
          <img src="${rate.provider_logo}" alt="${
        rate.provider
      }" class="logo" />
          <div class="details">
            <div class="company">${rate.provider} ${
        rate.service_level_name
      }</div>
            <div class="time">
              ${
                rate.delivery_days_min === rate.delivery_days_max
                  ? `${rate.delivery_days_min} days`
                  : `${rate.delivery_days_min}-${rate.delivery_days_max} days`
              }
            </div>
          </div>
          <div class="price-section">
            <div class="price">
              <div class="original-price">$${rate.retail_amount || 'N/A'}</div>
              <div class="current-price">$${rate.amount}</div>
            </div>
            <button class="buy-button" onclick='navigateToOrder(${JSON.stringify(
              rate,
            )})'>Buy</button>
          </div>
        </div>
      `;

      ['FASTEST', 'CHEAPEST', 'BESTVALUE'].forEach((category) => {
        const rate = data.rates.find((r) => r.attributes.includes(category));
        if (rate) {
          resultSection.innerHTML += createCard(rate, category);
        }
      });

      const otherRates = data.rates.filter(
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

  window.navigateToOrder = function (rate) {
    const queryParams = new URLSearchParams({
      ...formData.step1,
      ...formData.step2,
      ...formData.step3,
      rate: JSON.stringify(rate),
    });

    window.location.href = `order?${queryParams.toString()}`;
  };
});
