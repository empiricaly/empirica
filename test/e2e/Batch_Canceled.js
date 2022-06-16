// Batch_Canceled.js

describe("Batch canceled", () => {
    const condition = "cypress1";

    beforeEach(() => {

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

    it("from introsteps", () => {
        const playerKey = 'test_'+Math.floor(Math.random() * 1e13)
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
        // Do not advance here

        // Cancel Batch
        cy.empiricaLoginAdmin();
        cy.empiricaClearBatches()

        // Check redirect to correct screen
        cy.visit(`http://localhost:3000/?playerKey=${playerKey}`);
        cy.wait(3000)
        cy.contains("Instruction", { timeout: 5000 }).should("not.exist");
        
        // TODO: Check that sorry page displays here
    });


    it("from game", () => {
        const playerKey = 'test_'+Math.floor(Math.random() * 1e13)
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
        cy.contains("Jelly Beans", { timeout: 10000 });
        cy.get("button").contains("Submit").click();
        cy.contains("Result", { timeout: 5000 })
        cy.get("button").contains("Submit").click();

        // Minesweeper
        cy.contains("Minesweeper")
        // Do not advance here

        // Cancel Batch
        cy.empiricaLoginAdmin();
        cy.empiricaClearBatches()

        // Check redirect to correct screen
        cy.visit(`http://localhost:3000/?playerKey=${playerKey}`);
        cy.wait(3000)
        cy.contains("Minesweeper", { timeout: 5000 }).should("not.exist");
        
        // TODO: Check that sorry page displays here
    });
    


});