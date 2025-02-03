const appId = 'sandbox-sq0idb-h79KvJzFeQmHWEzcdJ-ZFg';
const locationId = 'L7KSRF7VR56SV';

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

function parseReadableData(queryParams) {
  const readableData = { ...queryParams }; // Clone the input object
  console.log({ readableData });
  // Decode and parse JSON fields if present
  const parseJSONField = (fieldName) => {
    if (readableData[fieldName]) {
      try {
        readableData[fieldName] = JSON.parse(
          decodeURIComponent(readableData[fieldName]),
        );
      } catch (e) {
        console.error(
          `Error decoding and parsing '${fieldName}' parameter:`,
          e,
        );
      }
    }
  };

  // Decode and parse specific fields
  ['rate', 'step1', 'step2', 'step3'].forEach(parseJSONField);

  // Convert rate keys to camelCase and format the data
  if (readableData.rate) {
    const toCamelCase = (str) =>
      str.replace(/([-_][a-z])/gi, (match) =>
        match.toUpperCase().replace(/[-_]/g, ''),
      );

    readableData.rate = Object.fromEntries(
      Object.entries(readableData.rate).map(([key, value]) => [
        toCamelCase(key),
        value,
      ]),
    );
  }

  // Extract and format dimensions and weight
  const dimensions = readableData.step3
    ? `${readableData.step3.length || 'N/A'} x ${
        readableData.step3.width || 'N/A'
      } x ${readableData.step3.height || 'N/A'} (${
        readableData.step3.dimensionUnit || 'N/A'
      })`
    : 'N/A';

  const weight = readableData.step3
    ? `${readableData.step3.weight || 'N/A'} ${
        readableData.step3.weightUnit || 'N/A'
      }`
    : 'N/A';

  return {
    senderAddress: readableData.step1 || {},
    receiverAddress: readableData.step2 || {},
    dimensions,
    weight,
    rate: readableData.rate || {},
    productDescription: readableData.step3 || {},
  };
}

function extractAmountFromRate(rateParam) {
  try {
    const rate = JSON.parse(decodeURIComponent(rateParam));
    console.log({ rate });
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
  console.log({ queryParamsReadableData: readableData });
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
    const amountInput = '1.00';
    const billingDetails = {
      givenName: formData.step1.name,
      familyName: formData.step1.name,
      email: formData.step1.email,
      phone: formData.step1.phone,
      addressLines: [readableData.senderAddress.street],
      city: readableData.senderAddress.city,
      state: readableData.senderAddress.state,
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

      // Send data to webhook
      sendDataToWebhook();
    } else {
      statusContainer.textContent = 'Payment Failed!';
      statusContainer.classList.add('failure');
    }
    statusContainer.style.visibility = 'visible';
  }

  async function sendDataToWebhook() {
    const allData = {
      senderAddress: readableData.senderAddress,
      receiverAddress: readableData.receiverAddress,
      shipmentDetails: readableData.productDescription,
      dimensions: readableData.dimensions,
      weight: readableData.weight,
      rateDetails: readableData.rate,
      paymentAmount: readableData.rate?.amount || 'N/A',
      paymentCurrency: readableData.rate?.currency || 'N/A',
      formData,
    };

    try {
      const response = await fetch(
        'https://hook.us2.make.com/9cxeqjtjrd8pl6bt6b7fpey6p3qhoa92',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(allData),
        },
      );

      if (response.ok) {
        console.log('Data successfully sent to webhook', response);
      } else {
        console.error('Failed to send data to webhook:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending data to webhook:', error);
    }
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
    if (step === 1) {
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

  // Display final step data
  function displayFinalData() {
    const finalDataContainer = document.querySelector('#final-step-data');

    // Form Data Display
    // <p><strong>Name:</strong> ${formData.step1.name || ''}</p>
    // <p><strong>Email:</strong> ${formData.step1.email || ''}</p>
    // <p><strong>Phone:</strong> ${formData.step1.phone || ''}</p>
    // <p><strong>Name:</strong> ${formData.step2.name || ''}</p>
    // <p><strong>Email:</strong> ${formData.step2.email || ''}</p>
    // <p><strong>Phone:</strong> ${formData.step2.phone || ''}</p>
    const formDataHTML = `
      <h3>Sender Information</h3>
      <p><strong>Name:</strong> ${readableData.senderAddress?.name || ''}</p>
      <p><strong>Email:</strong> ${readableData.senderAddress?.email || ''}</p>
      <p><strong>Phone:</strong> ${readableData.senderAddress?.Phone || ''}</p>
      <p><strong>Street:</strong> ${
        readableData.senderAddress?.street || 'N/A'
      }</p>
      <p><strong>State:</strong> ${
        readableData.senderAddress?.state || 'N/A'
      }</p>
      <p><strong>City:</strong> ${readableData.senderAddress?.city || 'N/A'}</p>
      <p><strong>Postal Code:</strong> ${
        readableData.senderAddress?.postalCode || 'N/A'
      }</p>
      
      <h3>Receiver Information</h3>
      <p><strong>Name:</strong> ${readableData.receiverAddress?.name || ''}</p>
      <p><strong>Email:</strong> ${
        readableData.receiverAddress?.email || ''
      }</p>
      <p><strong>Phone:</strong> ${
        readableData.receiverAddress?.Phone || ''
      }</p>
      <p><strong>Street:</strong> ${
        readableData.receiverAddress?.street || 'N/A'
      }</p>
      <p><strong>State:</strong> ${
        readableData.receiverAddress?.state || 'N/A'
      }</p>
      <p><strong>City:</strong> ${
        readableData.receiverAddress?.city || 'N/A'
      }</p>
      <p><strong>Postal Code:</strong> ${
        readableData.receiverAddress?.postalCode || 'N/A'
      }</p>
    `;

    const shipmentDetailsHTML = `
      <h3>Shipment Details:</h3>
      <p><strong>Product Description:</strong> ${
        readableData.productDescription?.productDescription || 'N/A'
      }</p>
      <p><strong>Product Quantity:</strong> ${
        readableData.productDescription?.productQuantity || 'N/A'
      }</p>
      <p><strong>Product Value:</strong> ${
        readableData.productDescription?.productValue || 'N/A'
      }</p>
      <p><strong>Country of Origin:</strong> ${
        readableData.productDescription?.countryOfOrigin || 'N/A'
      }</p>
      <p><strong>Purpose of Shipment:</strong> ${
        readableData.productDescription?.purposeOfShipments || 'N/A'
      }</p>
      <p><strong>Dimensions:</strong> ${readableData.dimensions || 'N/A'}</p>
      <p><strong>Weight:</strong> ${readableData.weight || 'N/A'}</p>
    `;

    const rateDetailsHTML = `
      <h3>Rate Details:</h3>
      <p><strong>Amount:</strong> ${readableData.rate?.amount || 'N/A'} ${
      readableData.rate?.currency || 'N/A'
    }</p>
      <p><strong>Retail Amount:</strong> ${
        readableData.rate?.amountLocal || 'N/A'
      } ${readableData.rate?.currencyLocal || 'N/A'}</p>
      <p><strong>Attributes:</strong> ${
        readableData.rate?.attributes?.join(', ') || 'N/A'
      }</p>
      <p><strong>Service Level:</strong> ${
        readableData.rate?.servicelevel?.name || 'N/A'
      }</p>
      <p><strong>Delivery Days:</strong> ${
        readableData.rate?.estimatedDays || 'N/A'
      }</p>
      <p><strong>Provider:</strong> ${readableData.rate?.provider || 'N/A'}</p>
      <img src="${readableData.rate?.providerImage_75 || ''}" alt="${
      readableData.rate?.provider || ''
    }">
      <p><strong>Duration Terms:</strong> ${
        readableData.rate?.durationTerms || 'N/A'
      }</p>
      <p><strong>Carrier Account:</strong> ${
        readableData.rate?.carrierAccount || 'N/A'
      }</p>
      <p><strong>Zone:</strong> ${readableData.rate?.zone || 'N/A'}</p>
      <p><strong>Insurance Included:</strong> ${
        readableData.rate?.includedInsurancePrice || 'N/A'
      }</p>
      <p><strong>Created On:</strong> ${
        readableData.rate?.objectCreated || 'N/A'
      }</p>
      <p><strong>Owner:</strong> ${readableData.rate?.objectOwner || 'N/A'}</p>
      <p><strong>Test Mode:</strong> ${
        readableData.rate?.test ? 'Yes' : 'No'
      }</p>
    `;

    // Combine and display data
    // finalDataContainer.innerHTML = formDataHTML + readableDataHTML;
    finalDataContainer.innerHTML =
      formDataHTML + shipmentDetailsHTML + rateDetailsHTML;
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
  // const confirmCheckbox = document.getElementById('confirm-checkbox');
  // const nextStepButton = document.getElementById('next-step-button');

  // confirmCheckbox.addEventListener('change', function () {
  //   nextStepButton.disabled = !this.checked;
  //   cardButton.disabled = !this.checked;
  // });
});
