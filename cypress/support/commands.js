Cypress.Commands.add("ensureHotelOwnerToken", () => {
    const email = Cypress.env("hotelOwnerEmail");
    const password = Cypress.env("hotelOwnerPassword");
    const name = Cypress.env("hotelOwnerName") || "Cypress Hotel Owner";

    return cy
        .request({
            method: "POST",
            url: `${Cypress.env("apiBaseUrl")}/auth/login`,
            body: { email, password },
            failOnStatusCode: false,
        })
        .then((loginRes) => {
            if (loginRes.status === 200 && loginRes.body?.token) {
                return loginRes.body.token;
            }

            return cy
                .request({
                    method: "POST",
                    url: `${Cypress.env("apiBaseUrl")}/auth/register`,
                    body: {
                        name,
                        email,
                        password,
                        role: "Hotel Owner",
                    },
                    failOnStatusCode: false,
                })
                .then(() =>
                    cy.request({
                        method: "POST",
                        url: `${Cypress.env("apiBaseUrl")}/auth/login`,
                        body: { email, password },
                    })
                )
                .then((secondLoginRes) => secondLoginRes.body.token);
        });
});
