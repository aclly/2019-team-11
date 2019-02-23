import api from '../../server-core/api-client';

describe("ApiClient", () => {
    let huc;
    let huc12;
    let charName;

    beforeEach(() => {
        jest.setTimeout(30000);
        huc = "07100006";
        huc12 = "071000060204";
        charName = "Escherichia%20coli";
    });

    it('should get data', async () => {
        var test = await api.getSampleResults(huc, charName);
        expect(test).not.toBe(null);
    });

    it('She dont get wet', async () => {
        var test = await api.getSampleResults(huc, charName);
        expect(test).not.toBe("She get wet");
    });

    it('fibi should get data', () => {
        return api.getFibiData(huc12).then(function (data) {
            expect(data).toEqual({ "data": [{ "class": "Good", "date": "2006-09-27T00:00:00", "name": "FIBI", "type": "Warm Water", "unit": "rating", "value": 57 }], "lat": 42.68869, "long": -94.79849, "name": "Big Cedar Creek" });
        })
    })

    it('fibi should not error', () => {
        return api.getFibiData(huc12).then(function (data) {
            expect(data).not.toBe("error");
        })
    })

    it('validate results', ()=>{
        const expectedResults = new Map([
            ["21IOWA_WQX-10810001", "4600"],
            ["21IOWA_WQX-21130001", "41"],
            ["21IOWA_WQX-21130002", "63"],
            ["21IOWA_WQX-21810001", "20"],
            ["21IOWA_WQX-21810002", null],
            ["21IOWA_WQX-22110001", "3.1"],
            ["21IOWA_WQX-22130001", "2"],
            ["21IOWA_WQX-22810002", "3.1"],
            ["IOWAGW_WQX-31250002", null],
        ]);

        return api.getEcoliData(huc).then(function (data) {
            for (var key of data.keys()) {
                expect(data.get(key).value).toBe(expectedResults.get(key))
            }
        })
    })

})
