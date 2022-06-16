// No_Experiments_Available.js
// This tests that the user is not presented with a game option 
// if there are no games available.

describe("no_experiments_available", () => {
    const playerKey = 'test_'+Math.floor(Math.random() * 1e13)

    before(() => {
        cy.empiricaLoginAdmin();
        cy.empiricaCreateBatch("Solo");
        cy.empiricaClearBatches();  // clearing just started batch


    });

    it("has no games available", () => {

        cy.waitUntil(
            () => cy.get('body', { log: false }).then( $body => $body.find('Running').length < 1),
            {description: "-assert that no games are running"}
        )
        
        cy.visit(`http://localhost:3000/?playerKey=${playerKey}`);
           
        cy.contains("No experiments available")
        cy.wait(10000)
        cy.contains("consent").should("not.exist");
        cy.contains("I AGREE").should("not.exist");
    })

});