const products = require("../data/products");

function findProductByWeight(weight) {
    return products.find(product => product.weight === weight);
}

function findProductCombination(requestedWeight) {
    // Önce birebir ürün var mı?
    const exactProduct = findProductByWeight(requestedWeight);

    if (exactProduct) {
        return {
            type: "EXACT",
            totalWeight: requestedWeight,
            totalPrice: exactProduct.price,
            items: [
                {
                    product: exactProduct,
                    quantity: 1
                }
            ]
        };
    }

    // Şimdilik 5 kg ürünlerden kombinasyon yapıyoruz
    const fiveKgProduct = findProductByWeight(5);

    if (
        fiveKgProduct &&
        requestedWeight % 5 === 0
    ) {
        const quantity = requestedWeight / 5;

        return {
            type: "COMBINATION",
            totalWeight: requestedWeight,
            totalPrice: fiveKgProduct.price * quantity,
            items: [
                {
                    product: fiveKgProduct,
                    quantity
                }
            ]
        };
    }

    return null;
}

module.exports = {
    findProductByWeight,
    findProductCombination
};