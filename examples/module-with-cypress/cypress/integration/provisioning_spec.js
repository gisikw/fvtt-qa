describe("Basic provisioning", () => {
  it("Loads Foundry instance provisioned by fvtt-qa", () => {
    cy.visit(Cypress.env("FOUNDRY_URL"));
  });
});
