import {
  DEFAULT_API_REQUEST_TIMEOUT,
  VALIDATE_CHANGES_TIMEOUT,
  INSTALL_PREPARATION_TIMEOUT,
  CLUSTER_CREATION_TIMEOUT,
  HOST_DISCOVERY_TIMEOUT,
  HOST_REGISTRATION_TIMEOUT,
} from './constants';

export const testInfraClusterName = 'test-infra-cluster';
export const testInfraClusterHostnames = [
  'test-infra-cluster-master-0',
  'test-infra-cluster-master-1',
  'test-infra-cluster-master-2',
];

export const withValueOf = (cy, selector, handler) => {
  cy.get(selector).then((elem) => handler(elem[0].innerText));
};

export const getClusterNameLinkSelector = (clusterName) => `#cluster-link-${clusterName}`;
export const testClusterLinkSelector = getClusterNameLinkSelector(testInfraClusterName);
export const clusterNameLinkSelector = '[data-label="Name"] > a'; // on '/clusters' page
// const singleClusterCellSelector = (column) => `tbody > tr > [data-label="${column}"]`;
export const clusterTableCellSelector = (row, column) =>
  `tbody > tr:nth-child(${row}) > [data-label="${column}"]`;
export const hostDetailSelector = (row, label) =>
  // NOTE: The first row is number 2! Shift your indexes...
  `table > tbody:nth-child(${row}) > tr:nth-child(1) > [data-label="${label}"]`;

export const PULL_SECRET = Cypress.env('PULL_SECRET');
export const SSH_PUB_KEY = Cypress.env('SSH_PUB_KEY');
export const CLUSTER_NAME = Cypress.env('CLUSTER_NAME');
export const DNS_DOMAIN_NAME = Cypress.env('DNS_DOMAIN_NAME');
export const API_VIP = Cypress.env('API_VIP');
export const INGRESS_VIP = Cypress.env('INGRESS_VIP');
export const NUM_MASTERS = parseInt(Cypress.env('NUM_MASTERS'));
export const NUM_WORKERS = parseInt(Cypress.env('NUM_WORKERS'));
export const API_BASE_URL = Cypress.env('API_BASE_URL');

// workaround for long text, expected to be copy&pasted by the user
export const pasteText = (cy, selector, text) => {
  cy.get(selector).then((elem) => {
    elem.text(text);
    elem.val(text);
    cy.get(selector).type(' {backspace}');
  });
};

export const openCluster = (clusterName) => {
  // Click the cluster name from the clusters list
  cy.visit('');
  cy.get(getClusterNameLinkSelector(clusterName)).click();
  // Cluster configuration - name
  cy.get('.pf-c-breadcrumb__list > :nth-child(2)').contains(clusterName);
  cy.get('#form-input-name-field').should('have.value', clusterName);
};

export const createCluster = (clusterName, pullSecret) => {
  cy.visit('');
  cy.get('#button-create-new-cluster').click();
  cy.get('#form-input-name-field').should('be.visible');
  cy.get('#form-input-name-field').clear();
  cy.get('#form-input-name-field').type(clusterName);
  cy.get('#form-input-name-field').should('have.value', clusterName);
  // feed in the pull secret
  cy.get('#form-input-pullSecret-field').clear();
  pasteText(cy, '#form-input-pullSecret-field', pullSecret);
  cy.get('form').submit();
  cy.get('#button-download-discovery-iso').should('be.visible');
  cy.get('#form-input-name-field').should('have.value', clusterName);
};

export const createDummyCluster = (cy, clusterName) => {
  cy.get('#button-create-new-cluster').click();
  cy.get('.pf-c-modal-box'); // modal visible
  cy.get('.pf-c-modal-box__header').contains('New Bare Metal OpenShift Cluster');
  cy.get('.pf-m-secondary').click(); // cancel

  cy.get('.pf-c-modal-box').should('not.be.visible'); // modal closed
  cy.get('#button-create-new-cluster').click();
  cy.get('.pf-c-modal-box'); // modal visible again

  // do not allow two clusters of the same name
  cy.get('#form-input-name-field').type(`{selectall}{backspace}${testInfraClusterName}`);
  cy.get('#form-input-pullSecret-field').clear();
  pasteText(cy, '#form-input-pullSecret-field', PULL_SECRET);
  cy.get('.pf-c-modal-box__footer > .pf-m-primary').click();
  cy.get('#form-input-name-field-helper').contains('is already taken');

  // type correct dummy cluster name
  cy.get('#form-input-name-field').type(`{selectall}{backspace}${clusterName}`);
  cy.get('.pf-c-modal-box__footer > .pf-m-primary').click();

  // Cluster configuration
  cy.get('.pf-c-breadcrumb__list > :nth-child(2)').contains(clusterName);
  cy.get('#form-input-name-field').should('have.value', clusterName);

  // Close
  cy.get(':nth-child(4) > .pf-c-button').click();
};

export const deleteDummyCluster = (cy, tableRow, clusterName) => {
  const kebabSelector = `tbody > tr:nth-child(${tableRow}) > td.pf-c-table__action > div`;
  cy.get(kebabSelector).click(); // open kebab menu
  cy.get(`#button-delete-${clusterName}`).click(); // Delete & validate correct kebab from previous step
  cy.get('[data-test-id="delete-cluster-submit"]').click();

  cy.get(getClusterNameLinkSelector(clusterName)).should('not.exist');
  cy.get(testClusterLinkSelector); // validate that the test-infra-cluster is still present
};

export const generateIso = (sshPubKey) => {
  // click to download the discovery iso
  cy.get('#button-download-discovery-iso').click();
  // see that the modal popped up
  cy.get('h1#pf-modal-part-8').should('be.visible');
  // feed in the public ssh key
  pasteText(cy, '#form-input-sshPublicKey-discovery-field', sshPubKey);
  let aborted = false;
  cy.server({
    onAnyAbort: (...args) => {
      aborted = true;
      console.log('-- onAnyAbort: ', ...args);
    },
  });
  cy.get('.pf-c-modal-box__footer > .pf-m-primary').contains('Get Discovery ISO');
  cy.get('.pf-c-modal-box__footer > .pf-m-primary').click();
  // cy.get('.pf-c-modal-box__footer > .pf-m-primary', { timeout: 5 * 60 * 1000 });
  // bug: cy.get() timeout is ignored since former inner XHR is aborted by Cypress
  cy.wait(90 * 1000).then(() => {
    // yield potentially onAnyAbort()
    if (aborted) {
      cy.log('Long-running XHR was aborted');
      cy.get('.pf-c-alert').contains('Failed to download');
      cy.get('.pf-c-modal-box__footer > .pf-m-primary').contains('Get Discovery ISO', {
        timeout: 5 * 60 * 1000,
      });
      cy.get('.pf-c-modal-box__footer > .pf-m-primary').click();
    } else {
      cy.log('Waiting for ISO was successful');
    }
    cy.get('.pf-c-modal-box__footer > .pf-m-primary').contains('Download Discovery ISO');
  });
  cy.get('#pf-modal-part-7 > footer > button.pf-c-button.pf-m-secondary').click(); // now close the dialog
};

export const assertTestClusterPresence = (cy) => {
  cy.visit('/clusters');
  cy.get(testClusterLinkSelector).contains(testInfraClusterName);
  cy.get(clusterTableCellSelector(1, 'Base domain')).contains('redhat.com');
  cy.get(clusterTableCellSelector(1, 'Version')).contains('4.5'); // fail to raise attention when source data changes
  cy.get(clusterTableCellSelector(1, 'Status')).contains('Ready', {
    timeout: DEFAULT_API_REQUEST_TIMEOUT,
  });
  cy.get(clusterTableCellSelector(1, 'Hosts')).contains(3);
};

export const visitTestCluster = (cy) => {
  assertTestClusterPresence(cy);
  cy.visit('/clusters');
  cy.get(testClusterLinkSelector).click();
};

export const checkValidationMessage = (cy, expectedMsg) => {
  cy.get(':nth-child(5) > [data-pf-content="true"] > .pf-c-button').contains(
    'The cluster is not ready to be installed yet',
  );

  cy.get('.pf-c-alert').should('not.be.visible');
  cy.get(':nth-child(5) > [data-pf-content="true"] > .pf-c-button').click();
  cy.get('.pf-c-alert').should('be.visible');
  cy.get('.pf-c-alert__description').contains(expectedMsg);

  // Close
  cy.get('.pf-l-split > :nth-child(2) > .pf-c-button').click(); // close alerts
  cy.get('.pf-c-alert').should('not.be.visible');
};

export const startClusterInstallation = () => {
  // wait up to 10 seconds for the install button to be enabled
  cy.get('button[name="install"]', { timeout: VALIDATE_CHANGES_TIMEOUT }).should(($elem) => {
    expect($elem).to.be.enabled;
  });
  cy.get('button[name="install"]').click();
  // wait for the progress description to say "Installing" [temporarily comented out because
  // there is no div.pf-c-progress__description any more...]
  // cy.contains('div.pf-c-progress__description', 'Installing', {
  //   timeout: INSTALL_PREPARATION_TIMEOUT,
  // });
};

export const waitForClusterInstallation = () => {
  // wait up to 1 hour for the progress description to say "Installed"
  cy.contains('div.pf-c-progress__description', 'Installed', { timeout: CLUSTER_CREATION_TIMEOUT });
};

export const waitForHostTablePopulation = (cy) => {
  // wait for hosts to boot and populated in table
  cy.get('table.hosts-table > tbody', { timeout: HOST_REGISTRATION_TIMEOUT }).should(($els) => {
    expect($els.length).to.be.eq(NUM_MASTERS + NUM_WORKERS);
  });
};

export const waitForPendingInputState = (cy) => {
  // wait until hosts are getting to pending input state
  for (let i = 2; i <= NUM_MASTERS + NUM_WORKERS + 1; i++) {
    cy.contains(hostDetailSelector(i, 'Status'), 'Pending input', {
      timeout: HOST_DISCOVERY_TIMEOUT,
    });
  }
};

export const waitForHostsSubnet = (cy) => {
  // wait until hosts subnet populated in the cluster details
  cy.get('#form-input-hostSubnet-field')
    .find('option', { timeout: HOST_DISCOVERY_TIMEOUT })
    .should(($els) => {
      expect($els.length).to.be.gt(0);
    })
    .and(($els) => {
      expect($els[0]).not.to.have.text('No subnets available');
    });
};

export const waitForHostsToBeKnown = () => {
  // wait until hosts are getting to pending input state
  for (let i = 2; i <= NUM_MASTERS + NUM_WORKERS + 1; i++) {
    cy.contains(hostDetailSelector(i, 'Status'), 'Known', {
      timeout: HOST_DISCOVERY_TIMEOUT,
    });
  }
};

export const setClusterDnsDomain = (dnsDomain = DNS_DOMAIN_NAME, isEmpty = false) => {
  // set the cluster DNS domain name
  cy.get('#form-input-baseDnsDomain-field').clear();
  if (isEmpty == false) {
    cy.get('#form-input-baseDnsDomain-field').type(dnsDomain);
    cy.get('#form-input-baseDnsDomain-field').should('have.value', dnsDomain);
  }
};

export const setClusterSubnetCidr = (cy) => {
  // select the first subnet from list
  cy.get('#form-input-hostSubnet-field')
    .find('option')
    .then(($els) => $els.get(0).setAttribute('selected', 'selected'))
    .parent()
    .trigger('change');
};

export const setHostsRole = () => {
  // set hosts role
  cy.get('#form-input-name-field').click().type('{end}{home}');
  for (let i = 2; i < 2 + NUM_MASTERS; i++) {
    cy.get(hostDetailSelector(i, 'Role')).click().find('li#master').click();
  }
  for (let i = 2 + NUM_MASTERS; i < 2 + NUM_MASTERS + NUM_WORKERS; i++) {
    cy.get(hostDetailSelector(i, 'Role')).click().find('li#worker').click();
  }
};

export const saveClusterDetails = (cy) => {
  // click the 'save' button in order to save changes in the cluster info
  cy.get('button[name="save"]', { timeout: VALIDATE_CHANGES_TIMEOUT }).should('be.enabled');
  cy.get('button[name="save"]').click();
};

export const makeApiCall = (
  apiPostfix,
  method,
  responseHandler,
  requestBody = {},
  failOnStatusCode = true,
) => {
  // get ocm api token from cookies
  cy.getCookie('cs_jwt').then((cookie) => {
    const requestOptions = {
      method: method,
      url: `${API_BASE_URL}${apiPostfix}`,
      body: requestBody,
      failOnStatusCode: failOnStatusCode,
    };

    // if token cookie is set attach to request
    if (cookie) {
      cy.log('using cookie');
      requestOptions.headers = {
        Authorization: `Bearer ${cookie.value}`,
      };
    }

    cy.request(requestOptions).then(responseHandler);
  });
};

export const verifyClusterCreationApi = (clusterName) => {
  // response handler for makeApiCall
  const findClusterInList = (response) => {
    const clusters = response.body;
    const checkClusterName = (cluster) => clusterName.localeCompare(cluster.name) === 0;

    expect(clusters.some(checkClusterName)).to.be.true;
  };

  makeApiCall('/api/assisted-install/v1/clusters', 'get', findClusterInList);
};
