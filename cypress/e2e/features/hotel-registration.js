import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";

let token;
let payload;
let createRes;
let confirmRes;
let duplicateRes;
const createdHotelIds = [];

const buildUniqueHotelPayload = (basePayload) => {
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const clonedPayload = JSON.parse(JSON.stringify(basePayload));

    clonedPayload.businessInfo.name = `${clonedPayload.businessInfo.name} ${uniqueId}`;
    clonedPayload.businessInfo.registrationNumber = `REG-${uniqueId}`;
    clonedPayload.businessInfo.licenseNumber = `LIC-${uniqueId}`;
    clonedPayload.businessInfo.contact.email = `hotel-${uniqueId}@example.com`;

    return clonedPayload;
};

Given("I am authenticated as a hotel owner", () => {
    cy.ensureHotelOwnerToken().then((resolvedToken) => {
        token = resolvedToken;
    });
});

Given("I have a valid unique hotel payload", () => {
    cy.fixture("hotels/hotel.valid.minimal.json").then((basePayload) => {
        payload = buildUniqueHotelPayload(basePayload);
    });
});

When("I submit the hotel registration request", () => {
    cy.request({
        method: "POST",
        url: `${Cypress.env("apiBaseUrl")}/hotels`,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: payload,
    }).then((response) => {
        createRes = response;
        const hotelId = createRes.body?.data?.hotelId;
        if (hotelId) createdHotelIds.push(hotelId);
    });
});

Then("the registration response should be successful", () => {
    expect(createRes.status).to.eq(201);
    expect(createRes.body.success).to.eq(true);
});

Then("I should receive a hotel id and candidate list", () => {
    expect(createRes.body.data.hotelId).to.be.a("string").and.not.empty;
    expect(createRes.body.data.candidates).to.be.an("array");
});

When("I confirm the hotel match using the first candidate or null", () => {
    const hotelId = createRes.body.data.hotelId;
    const candidates = createRes.body.data.candidates || [];
    const selectedPlaceId = candidates.length > 0 ? candidates[0].place_id : null;

    cy.request({
        method: "POST",
        url: `${Cypress.env("apiBaseUrl")}/hotels/${hotelId}/confirm-match`,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: {
            placeId: selectedPlaceId,
        },
    }).then((response) => {
        confirmRes = response;
    });
});

Then("the confirmation response should be successful", () => {
    expect(confirmRes.status).to.eq(200);
    expect(confirmRes.body.success).to.eq(true);
});

Then("the evaluation status should be one of pending passed failed", () => {
    expect(confirmRes.body.evaluation).to.have.property("status");
    expect(["pending", "passed", "failed"]).to.include(confirmRes.body.evaluation.status);
});

When("I submit the same hotel registration payload again", () => {
    cy.request({
        method: "POST",
        url: `${Cypress.env("apiBaseUrl")}/hotels`,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: payload,
        failOnStatusCode: false,
    }).then((response) => {
        duplicateRes = response;
    });
});

Then("the duplicate response status should be 409", () => {
    expect(duplicateRes.status).to.eq(409);
});

After(() => {
    if (!token || createdHotelIds.length === 0) return;

    createdHotelIds.forEach((hotelId) => {
        cy.request({
            method: "DELETE",
            url: `${Cypress.env("apiBaseUrl")}/hotels/${hotelId}`,
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
        });
    });
});
