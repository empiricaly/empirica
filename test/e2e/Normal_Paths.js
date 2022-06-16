// Normal_Paths.js
// This test aims to test all the functionality that a user
// will encounter if they proceed through the experiement as expected

describe("normal_paths", () => {
  const playerKey = "test_" + Math.floor(Math.random() * 1e13);

  before(() => {
    cy.empiricaLoginAdmin();
    cy.empiricaClearBatches();
    cy.empiricaCreateBatch("Solo");

    //Start batch
    cy.get("tr", { log: false })
      .last({ log: false })
      .contains("Start", { log: false })
      .click({ log: "Start Button" });
    //Check started
    cy.waitUntil(() =>
      cy
        .get("tr")
        .last()
        .then(($tr) => $tr.find('button:contains("Stop")').length == 1)
    );
  });

  it("walks properly", () => {
    
    cy.visit(`http://localhost:3000/?playerKey=${playerKey}`);
    // Consent
    cy.log("Consent");
    cy.contains("consent", { timeout: 5000 });
    cy.get("button").contains("I AGREE").click();

    // Login
    cy.log("Add Username");
    cy.contains("Enter your", { timeout: 5000 });
    cy.get("input").click().type(playerKey);
    cy.get("button").contains("Enter").click();
  
    //Instructions
    cy.log("Intro Page")
    cy.contains("Instruction", { timeout: 5000 });
    cy.get("button").contains("Next").click();

    // Jelly Beans
    cy.contains("Jelly Beans", { timeout: 5000 });
    cy.get("button").contains("Submit").click();
    cy.contains("Result", { timeout: 5000 })
    cy.get("button").contains("Submit").click();

    // Minesweeper
    cy.contains("Minesweeper")
    cy.get("button").contains("done").click();

    // Exit survey
    cy.contains("Bonus")
    cy.get("button").contains("Submit").click();

    // Finished
    cy.contains("Finished")

  });
});
