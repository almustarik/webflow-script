const appId = 'sandbox-sq0idb-h79KvJzFeQmHWEzcdJ-ZFg';
const locationId = 'L7KSRF7VR56SV';

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

function parseReadableData(queryParams) {
  const readableData = { ...queryParams }; // Clone the input object

  // Helper function to convert a string to camelCase
  const toCamelCase = (str) =>
    str.replace(/([-_][a-z])/gi, (match) =>
      match.toUpperCase().replace(/[-_]/g, ''),
    );

  // Decode and parse the `rate` field
  if (readableData.rate) {
    try {
      readableData.rate = JSON.parse(decodeURIComponent(readableData.rate));
    } catch (e) {
      console.error("Error decoding and parsing 'rate' parameter:", e);
    }
  }

  // Convert keys to camelCase and format the data
  const formattedData = {
    senderZipCode: readableData.fromZip,
    receiverZipCode: readableData.toZip,
    dimensions: `${readableData.length} x ${readableData.width} x ${readableData.height} (${readableData.dimensionUnit})`,
    weight: `${readableData.weight} ${readableData.weightUnit}`,
    rate: readableData.rate
      ? Object.fromEntries(
          Object.entries(readableData.rate).map(([key, value]) => [
            toCamelCase(key),
            value,
          ]),
        )
      : 'N/A',
  };

  return formattedData;
}

function extractAmountFromRate(rateParam) {
  try {
    const rate = JSON.parse(decodeURIComponent(rateParam));
    return rate.amount;
    // return rate.retail_amount;
  } catch (e) {
    console.error('Error parsing rate parameter:', e);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const queryParams = getQueryParams();
  const readableData = parseReadableData(queryParams);
  console.log({ readableData });
  const rateParam = queryParams.rate;
  const amount = extractAmountFromRate(rateParam);
  const formData = {
    step1: {},
    step2: {},
  };

  function validateStep(step) {
    const currentFields = stepContents[step - 1].querySelectorAll(
      'input[required], select[required]',
    );
    for (const field of currentFields) {
      if (!field.value.trim()) {
        toastr.warning(
          `Please fill in the "${field.previousElementSibling.textContent}" field.`,
        );
        field.focus();
        return false;
      }
    }
    return true;
  }

  const cardButton = document.getElementById('card-button');
  const totalAmount = document.getElementById('total-amount');
  if (amount) {
    cardButton.textContent = `Pay $${amount}`;
    totalAmount.textContent = `$${amount}`;
  }

  if (!window.Square) {
    throw new Error('Square.js failed to load properly');
  }

  let payments;
  try {
    payments = window.Square.payments(appId, locationId);
  } catch {
    const statusContainer = document.getElementById('payment-status-container');
    statusContainer.className = 'missing-credentials';
    statusContainer.style.visibility = 'visible';
    return;
  }

  let card;
  try {
    card = await initializeCard(payments);
  } catch (e) {
    console.error('Initializing Card failed', e);
    return;
  }

  async function initializeCard(payments) {
    const card = await payments.card();
    await card.attach('#card-container');
    return card;
  }

  async function createPayment(token, verificationToken) {
    const body = JSON.stringify({
      amount: Number(amount),
      locationId,
      sourceId: token,
      verificationToken,
      idempotencyKey: window.crypto.randomUUID(),
    });

    const paymentResponse = await fetch(
      'https://payment.handsoffshipping.com/payment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      },
    );

    if (paymentResponse.ok) {
      return paymentResponse.json();
    }

    const errorBody = await paymentResponse.text();
    throw new Error(errorBody);
  }

  async function tokenize(paymentMethod) {
    const tokenResult = await paymentMethod.tokenize();
    if (tokenResult.status === 'OK') {
      return tokenResult.token;
    } else {
      let errorMessage = `Tokenization failed with status: ${tokenResult.status}`;
      if (tokenResult.errors) {
        errorMessage += ` and errors: ${JSON.stringify(tokenResult.errors)}`;
      }
      throw new Error(errorMessage);
    }
  }

  async function verifyBuyer(payments, token) {
    console.log({ step1: formData.step1, step2: formData.step2 });
    const amountInput = '1.00';
    /*const billingDetails = {
            givenName: 'John',
            familyName: 'Doe',
            email: 'john.doe@example.com',
            phone: '1234567890',
            addressLines: ['123 Main Street'],
            city: 'London',
            state: 'LND',
            countryCode: 'GB',
          };*/
    const billingDetails = {
      givenName: formData.step1.name,
      familyName: formData.step1.name,
      email: formData.step1.email,
      phone: formData.step1.phone,
      addressLines: [formData.step1.street],
      city: formData.step1.city,
      state: formData.step1.state,
      countryCode: 'GB',
    };

    const verificationDetails = {
      amount: amountInput,
      billingContact: billingDetails,
      currencyCode: 'USD',
      intent: 'CHARGE',
    };

    const verificationResults = await payments.verifyBuyer(
      token,
      verificationDetails,
    );
    return verificationResults.token;
  }

  function displayPaymentResults(status) {
    const statusContainer = document.getElementById('payment-status-container');
    if (status === 'SUCCESS') {
      statusContainer.textContent = 'Payment Successful!';
      //window.location.href = `/order-confirmation`;
      statusContainer.classList.add('success');
    } else {
      statusContainer.textContent = 'Payment Failed!';
      statusContainer.classList.add('failure');
    }
    statusContainer.style.visibility = 'visible';
  }

  cardButton.addEventListener('click', async function (event) {
    event.preventDefault();

    try {
      cardButton.disabled = true;
      const token = await tokenize(card);
      const verificationToken = await verifyBuyer(payments, token);
      const paymentResults = await createPayment(token, verificationToken);
      displayPaymentResults('SUCCESS');
    } catch (e) {
      displayPaymentResults('FAILURE');
      console.error(e.message);
    } finally {
      cardButton.disabled = false;
    }
  });

  const packageTypes = document.querySelectorAll('.package-type');
  const heightInput = document.querySelector('.height-input');
  const savingsSection = document.getElementById('savingsSection');
  const resultSection = document.getElementById('resultSection');
  const tabs = document.querySelectorAll('.tab');
  const localContainer = document.getElementById('localContainer');
  const internationalContainer = document.getElementById(
    'internationalContainer',
  );
  // Step switching functionality Start
  const steps = document.querySelectorAll('.step');
  const stepContents = document.querySelectorAll('.step-content');
  let currentStep = 1;

  // Step switching functionality End
  function updateStepper(step) {
    // Update step classes
    steps.forEach((s, index) => {
      if (index + 1 === step) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    // Show or hide step content
    stepContents.forEach((content, index) => {
      if (index + 1 === step) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // If on the final step, display all collected data
    if (step === 3) {
      displayFinalData();
    }
  }

  // Capture data from input and select fields in the current step
  // Capture data from input and select fields in the current step
  function captureStepData(step) {
    const currentFormFields =
      stepContents[step - 1].querySelectorAll('input, select');
    currentFormFields.forEach((field) => {
      const fieldName = field.name; // Use the `name` attribute to identify fields
      const fieldValue = field.value;

      if (step === 1) {
        formData.step1[fieldName] = fieldValue;
      } else if (step === 2) {
        formData.step2[fieldName] = fieldValue;
      }
    });

    // Log the data for the completed step
    console.log(
      `Step ${step} Data:`,
      step === 1 ? formData.step1 : formData.step2,
    );
  }

  //     // Display final step data
  //     function displayFinalData() {
  //       const finalDataContainer = document.querySelector('#final-step-data');
  //       finalDataContainer.innerHTML = `
  //   <h3>Sender Information</h3>
  //   <p><strong>Street:</strong> ${formData.step1.street || ''}</p>
  //   <p><strong>State:</strong> ${formData.step1.state || ''}</p>
  //   <p><strong>City:</strong> ${formData.step1.city || ''}</p>
  //   <p><strong>Postal Code:</strong> ${formData.step1.postalCode || ''}</p>

  //   <h3>Receiver Information</h3>
  //   <p><strong>Street:</strong> ${formData.step2.street || ''}</p>
  //   <p><strong>State:</strong> ${formData.step2.state || ''}</p>
  //   <p><strong>City:</strong> ${formData.step2.city || ''}</p>
  //   <p><strong>Postal Code:</strong> ${formData.step2.postalCode || ''}</p>
  // `;
  //     }

  // Display final step data
  function displayFinalData() {
    const finalDataContainer = document.querySelector('#final-step-data');

    // Form Data Display
    const formDataHTML = `
      <h3>Sender Information</h3>
      <p><strong>Name:</strong> ${formData.step1.name || ''}</p>
      <p><strong>Email:</strong> ${formData.step1.email || ''}</p>
      <p><strong>Street:</strong> ${formData.step1.street || ''}</p>
      <p><strong>State:</strong> ${formData.step1.state || ''}</p>
      <p><strong>City:</strong> ${formData.step1.city || ''}</p>
      <p style="display: none"><strong>Postal Code:</strong> ${
        formData.step1.postalCode || ''
      }</p>
      
      <h3>Receiver Information</h3>
      <p><strong>Name:</strong> ${formData.step2.name || ''}</p>
      <p><strong>Email:</strong> ${formData.step2.email || ''}</p>
      <p><strong>Street:</strong> ${formData.step2.street || ''}</p>
      <p><strong>State:</strong> ${formData.step2.state || ''}</p>
      <p><strong>City:</strong> ${formData.step2.city || ''}</p>
      <p style="display: none"><strong>Postal Code:</strong> ${
        formData.step2.postalCode || ''
      }</p>
    `;

    // Readable Data Display
    const readableDataHTML = `
      <h3>Shipping Details</h3>
      <p><strong>Sender Zip Code:</strong> ${readableData.senderZipCode}</p>
      <p><strong>Receiver Zip Code:</strong> ${readableData.receiverZipCode}</p>
      <p><strong>Dimensions:</strong> ${readableData.dimensions}</p>
      <p><strong>Weight:</strong> ${readableData.weight}</p>
      <p><strong>Rate Amount:</strong> ${readableData.rate.amount} ${readableData.rate.currency}</p>
      <p><strong>Retail Amount:</strong> ${readableData.rate.retailAmount} ${readableData.rate.currency}</p>
      <p><strong>Service Level Name:</strong> ${readableData.rate.serviceLevelName}</p>
      <p><strong>Delivery Days:</strong> ${readableData.rate.deliveryDaysMin} - ${readableData.rate.deliveryDaysMax}</p>
      <p><strong>Provider:</strong> ${readableData.rate.provider}</p>
      <p><img src="${readableData.rate.providerLogo}" alt="${readableData.rate.provider}" style="height: 40px;"></p>
    `;

    // Combine and display data
    finalDataContainer.innerHTML = formDataHTML + readableDataHTML;
  }

  document.querySelectorAll('.next-step').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(currentStep)) {
        return; // Stop if validation fails
      }
      if (currentStep < steps.length) {
        // Capture data before moving to the next step
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

  // Pre-fill review section
  document
    .getElementById('internationalShippingForm')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('reviewFrom').textContent =
        document.getElementById('intlFromCountry').value;
      document.getElementById('reviewTo').textContent =
        document.getElementById('intlToCountry').value;
      document.getElementById('reviewDimensions').textContent = `${
        document.getElementById('intlLength').value
      } x ${document.getElementById('intlWidth').value} x ${
        document.getElementById('intlHeight').value
      } (${document.getElementById('intlDimensionUnit').value})`;
      document.getElementById('reviewWeight').textContent = `${
        document.getElementById('intlWeight').value
      } ${document.getElementById('intlWeightUnit').value}`;
    });

  // Initialize the first step
  updateStepper(currentStep);

  // Enable/Disable "Next" button based on checkbox state
  const confirmCheckbox = document.getElementById('confirm-checkbox');
  const nextStepButton = document.getElementById('next-step-button');

  confirmCheckbox.addEventListener('change', function () {
    nextStepButton.disabled = !this.checked;
    cardButton.disabled = !this.checked;
  });
});
