// Game_Filled.js

describe("All games fill up with extra player in intro steps", () => {
  const playerKey = "test_" + Math.floor(Math.random() * 1e13);

  before(() => {
    cy.empiricaLoginAdmin();
        cy.empiricaClearBatches();
        cy.empiricaCreateBatch("Solo");
        
        //Start batch
        cy.get('tr', { log: false })
          .last({ log: false })
          .contains("Start", { log: false })
          .click( {log: "Start Button"})

        //Check started
        cy.waitUntil(() => 
            cy.get('tr').last().then( $tr => $tr.find('button:contains("Stop")').length == 1)
        )
        
  });

  it("redirects to sorry on game full", () => {
    //Non-completing player
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
    // Do not advance beyond instructions


    //Completing player
    cy.visit(`http://localhost:3000/?playerKey=${playerKey + "_complete"}`);

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
    // stay in game

    // Back to non-completing player
    cy.visit(`http://localhost:3000/?playerKey=${playerKey + "_no_complete"}`);
    cy.wait(3000);
    cy.contains("Instruction").should("not.exist");

    // Todo: check for gamefull page here.
  });
});
