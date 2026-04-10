describe("Hotel registration API flow", () => {
    let token;
    const createdHotelIds = [];

    const buildUniqueHotelPayload = (basePayload) => {
        const uniqueId = Date.now();
        const payload = JSON.parse(JSON.stringify(basePayload));

        payload.businessInfo.name = `${payload.businessInfo.name} ${uniqueId}`;
        payload.businessInfo.registrationNumber = `REG-${uniqueId}`;
        payload.businessInfo.licenseNumber = `LIC-${uniqueId}`;
        payload.businessInfo.contact.email = `hotel-${uniqueId}@example.com`;

        return payload;
    };

    before(() => {
        cy.ensureHotelOwnerToken().then((t) => {
            token = t;
        });
    });

    after(() => {
        if (!token || createdHotelIds.length === 0) return;

        createdHotelIds.forEach((id) => {
            cy.request({
                method: "DELETE",
                url: `${Cypress.env("apiBaseUrl")}/hotels/${id}`,
                headers: { Authorization: `Bearer ${token}` },
                failOnStatusCode: false,
            });
        });
    });

    it("creates hotel and confirms a match candidate", () => {
        cy.fixture("hotels/hotel.valid.minimal.json").then((basePayload) => {
            const payload = buildUniqueHotelPayload(basePayload);

            cy.request({
                method: "POST",
                url: `${Cypress.env("apiBaseUrl")}/hotels`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: payload,
            }).then((createRes) => {
                expect(createRes.status).to.eq(201);
                expect(createRes.body.success).to.eq(true);
                expect(createRes.body.data.hotelId).to.be.a("string").and.not.empty;
                expect(createRes.body.data.candidates).to.be.an("array");

                const hotelId = createRes.body.data.hotelId;
                createdHotelIds.push(hotelId);

                const candidates = createRes.body.data.candidates || [];
                const selectedPlaceId = candidates.length > 0 ? candidates[0].place_id : null;

                cy.request({
                    method: "POST",
                    url: `${Cypress.env("apiBaseUrl")}/hotels/${hotelId}/confirm-match`,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: { placeId: selectedPlaceId },
                }).then((confirmRes) => {
                    expect(confirmRes.status).to.eq(200);
                    expect(confirmRes.body.success).to.eq(true);
                    expect(confirmRes.body.evaluation).to.have.property("status");
                    expect(["pending", "passed", "failed"]).to.include(
                        confirmRes.body.evaluation.status
                    );
                });
            });
        });
    });

    it("rejects duplicate hotel registration with 409", () => {
        cy.fixture("hotels/hotel.valid.minimal.json").then((basePayload) => {
            const payload = buildUniqueHotelPayload(basePayload);

            cy.request({
                method: "POST",
                url: `${Cypress.env("apiBaseUrl")}/hotels`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: payload,
            }).then((firstRes) => {
                expect(firstRes.status).to.eq(201);
                const hotelId = firstRes.body.data.hotelId;
                createdHotelIds.push(hotelId);

                cy.request({
                    method: "POST",
                    url: `${Cypress.env("apiBaseUrl")}/hotels`,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: payload,
                    failOnStatusCode: false,
                }).then((dupRes) => {
                    expect(dupRes.status).to.eq(409);
                });
            });
        });
    });
});
