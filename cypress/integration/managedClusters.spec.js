import {
  createCluster,
  createDummyCluster,
  cancelDummyCluster,
  deleteDummyCluster,
  testInfraClusterName,
  testClusterLinkSelector,
  assertTestClusterPresence,
  clusterTableCellSelector,
  getClusterNameLinkSelector,
  kebabSelector,
  PULL_SECRET,
} from './shared';

const clustersTableHeaders = ['Name', 'Base domain', 'Version', 'Status', 'Hosts'];

describe('Managed Clusters list', () => {
  const clusterName = 'test-dummy-cluster';
  const clusterColHeaderSelector = (label) => `th[data-label="${label}"] > button`;

  beforeEach(() => {
    assertTestClusterPresence(cy);
    cy.visit('/clusters');
  });

  it('can render', () => {
    cy.get('h1').contains('Assisted Bare Metal Clusters');
  });

  it('has test-infra-cluster with visible columns', () => {
    clustersTableHeaders.forEach((header) =>
      cy.get(clusterColHeaderSelector(header)).contains(header),
    );
  });

  it('can create and delete dummy cluster', () => {
    // still single cluster in the list
    cy.get(kebabSelector(1)).click(); // open kebab
    cy.get('.pf-c-dropdown__menu-item').should('have.length', 1);

    // create and cancel the dummy cluster
    createDummyCluster(cy, clusterName, PULL_SECRET);
    cancelDummyCluster(cy);

    // do not allow two clusters of the same name
    createDummyCluster(cy, testInfraClusterName, PULL_SECRET);
    cy.get('button[name="save"]').click();
    cy.contains('#form-input-name-field-helper', 'is already taken');
    cancelDummyCluster(cy, testInfraClusterName);

    // create the dummy cluster
    createCluster(cy, clusterName, PULL_SECRET);

    // Close
    cy.get(':nth-child(4) > .pf-c-button').click();

    // Managed Clusters list
    cy.get('[data-label="Name"] > a').should('have.length', 2);
    cy.get(clusterTableCellSelector(1, 'Name')).contains(clusterName);
    cy.get(clusterTableCellSelector(2, 'Name')).contains(testInfraClusterName); // other cells of the test-infra-cluster are tested within assertTestClusterPresence()
    cy.get(clusterTableCellSelector(1, 'Base domain')).contains('-');
    cy.get(clusterTableCellSelector(1, 'Version')).contains('4.6');
    cy.get(clusterTableCellSelector(1, 'Status')).contains('Draft'); // insufficient ~ Draft
    cy.get(clusterTableCellSelector(1, 'Hosts')).contains(0);

    // sorting
    cy.get(clusterTableCellSelector(1, 'Name')).contains(clusterName); // initial state, before sorting
    cy.get(clusterTableCellSelector(2, 'Name')).contains(testInfraClusterName);
    cy.get(clusterColHeaderSelector('Name')).click();
    cy.get(clusterTableCellSelector(2, 'Name')).contains(clusterName); // clusters are flipped
    cy.get(clusterTableCellSelector(1, 'Name')).contains(testInfraClusterName);
    cy.get(clusterColHeaderSelector('Name')).click();
    cy.get(clusterTableCellSelector(1, 'Name')).contains(clusterName); // back to initial state
    cy.get(clusterTableCellSelector(2, 'Name')).contains(testInfraClusterName);

    // does it fail?
    clustersTableHeaders.forEach((header) => {
      cy.get(clusterColHeaderSelector(header)).click();
      cy.get(clusterColHeaderSelector(header)).click();
    });
    cy.get(clusterColHeaderSelector('Name')).click(); // sort by name again

    // Delete
    deleteDummyCluster(cy, 1, clusterName);

    // we are back to inital state with just a single cluster
    assertTestClusterPresence(cy); // fail fast here to verify that just the dummy cluster is deleted
  });

  it('can filter clusters', () => {
    // create
    createCluster(cy, 'cluster-aa-0', PULL_SECRET);
    createCluster(cy, 'cluster-bb-0', PULL_SECRET);
    // Close
    cy.get(':nth-child(4) > .pf-c-button').click();

    // all visible
    cy.get(testClusterLinkSelector);
    cy.get(getClusterNameLinkSelector('cluster-aa-0'));
    cy.get(getClusterNameLinkSelector('cluster-bb-0'));

    // search name
    cy.get('#search-string').type('NONSENS');
    cy.get(testClusterLinkSelector).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-aa-0')).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-bb-0')).should('not.exist');

    // clear search name
    cy.get('#search-string').type('{selectall}{backspace}');
    cy.get(testClusterLinkSelector);
    cy.get(getClusterNameLinkSelector('cluster-aa-0'));
    cy.get(getClusterNameLinkSelector('cluster-bb-0'));

    cy.get('#search-string').type('aa');
    cy.get(testClusterLinkSelector).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-bb-0')).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-aa-0')); // exists

    cy.get('#search-string').type('{selectall}{backspace}');
    cy.get(testClusterLinkSelector);

    // switch status
    cy.get('.pf-c-toolbar__item .pf-c-select__toggle').click();
    // cy.get('#Draft').click(); // FIXME: identifier no longer exists
    cy.contains('.pf-c-check__label', 'Draft').click();
    cy.get(testClusterLinkSelector).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-aa-0'));
    cy.get(getClusterNameLinkSelector('cluster-bb-0'));

    // cy.get('#Ready').click(); // FIXME: identifier no longer exists
    cy.contains('.pf-c-check__label', 'Ready').click();
    cy.get(testClusterLinkSelector);
    cy.get(getClusterNameLinkSelector('cluster-aa-0'));
    cy.get(getClusterNameLinkSelector('cluster-bb-0'));

    // cy.get('#Draft').click(); // FIXME: identifier no longer exists
    cy.contains('.pf-c-check__label', 'Draft').click();
    cy.get(testClusterLinkSelector);
    cy.get(getClusterNameLinkSelector('cluster-aa-0')).should('not.exist');
    cy.get(getClusterNameLinkSelector('cluster-bb-0')).should('not.exist');

    // clear all filters
    cy.get('#clusters-filter-toolbar > :nth-child(2) > :nth-child(2) > .pf-c-button').click();
    cy.get(testClusterLinkSelector);
    cy.get(getClusterNameLinkSelector('cluster-aa-0'));
    cy.get(getClusterNameLinkSelector('cluster-bb-0'));

    // Delete
    deleteDummyCluster(cy, 1, 'cluster-aa-0');
    deleteDummyCluster(cy, 1, 'cluster-bb-0');

    // we are back to inital state with just a single cluster
    assertTestClusterPresence(cy); // fail fast here to verify that just the dummy cluster is deleted
  });
});
