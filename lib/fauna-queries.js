import faunadb from "faunadb";

const {
  Create,
  Collection,
  CreateFunction,
  Lambda,
  Get,
  Ref,
  Call,
  Function,
  Var,
  Select,
  Exists,
  Map,
} = faunadb.query;

export const createOrder = async (data) => {
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET_KEY });
  return await client.query(
    Create(Collection("Orders"), {
      data,
    })
  );
};

export const submitOrder = async (order) => {
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET_KEY });
  return await client.query(Call(Function("submit_order"), order));
};

export const createSubmitOrderFunction = async () => {
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET_KEY });
  return await client.query(
    CreateFunction({
      name: "submit_order",
      body: Query(
        Lambda(
          ["order"],
          Let(
            {
              line_items: Select(["line_items"], Var("order")),
              products: Map(
                Var("line_items"),
                Lambda(
                  "requestedProduct",
                  Let(
                    {
                      product_match: Match(
                        Index("product_by_shopify_product_id"),
                        Select("product_id", Var("requestedProduct"))
                      ),
                      product_exists: Exists(Var("product_match")),
                      product: If(
                        Var("product_exists"),
                        Get(Var("product_match")),
                        false
                      ),
                    },
                    // Build up a new temporal product object containing
                    // the data given as parameter together with the
                    // data retrieved from the database.
                    If(
                      Var("product_exists"),
                      {
                        ref: Select("ref", Var("product")),
                        currentQuantity: Select(
                          ["data", "quantity"],
                          Var("product")
                        ),
                        requestedQuantity: Select(
                          ["quantity"],
                          Var("requestedProduct")
                        ),
                      },
                      false
                    )
                  )
                )
              ),
            },
            Do(
              // Update products stock
              // Then, we need to update the product stock quantity
              // accordingly. To do this, we update each product document
              // through the Update function subtracting the requested
              // quantity from its current quantity.
              Create(Collection("Orders"), {
                data: Var("order"),
              }),
              Map(
                Var("products"),
                Lambda(
                  "product",
                  If(
                    Equals(Var("product"), false),
                    null,
                    Update(Select("ref", Var("product")), {
                      data: {
                        quantity: Subtract(
                          Select("currentQuantity", Var("product")),
                          Select("requestedQuantity", Var("product"))
                        ),
                      },
                    })
                  )
                )
              )
            )
          )
        )
      ),
    })
  );
};
