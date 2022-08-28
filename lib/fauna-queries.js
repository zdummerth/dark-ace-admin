import faunadb, { Count } from "faunadb";

const {
  Create,
  Collection,
  CreateFunction,
  Lambda,
  Get,
  Ref,
  Update,
  Paginate,
  Filter,
  Union,
  Call,
  If,
  Let,
  Match,
  Index,
  Function,
  Var,
  Select,
  Exists,
  Equals,
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

export const updateOrder = async (order) => {
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET_KEY });
  return await client.query(
    Let(
      {
        order_match: Match(Index("order_by_id"), order.id),
        order_exists: Exists(Var("order_match")),
        order: If(Var("order_exists"), Get(Var("order_match")), false),
      },
      // Build up a new temporal product object containing
      // the data given as parameter together with the
      // data retrieved from the database.
      If(
        Var("order_exists"),
        Update(Select("ref", Var("order")), {
          data: order,
        }),
        Create(Collection("Orders"), {
          data: order,
        })
      )
    )
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

export const getVariantSalesData = async (data) => {
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET_KEY });
  return await client.query(
    Let(
      {
        t: Map(
          Paginate(
            Match(
              Index("order_by_line_item_product_title"),
              "Whitechapel Longsleeve Pre-Order"
            ),
            { size: 2000 }
          ),
          Lambda(
            ["order"],
            Let(
              {
                orderDoc: Get(Var("order")),
                line_items: Select(["data", "line_items"], Var("orderDoc")),
                filtered: Filter(
                  Var("line_items"),
                  Lambda(
                    "line_item",
                    Let(
                      {
                        product_title: Select("title", Var("line_item")),
                      },
                      Equals(
                        Var("product_title"),
                        "Whitechapel Longsleeve Pre-Order"
                      )
                    )
                  )
                ),
              },
              Var("filtered")
            )
          )
        ),
        flattened: Union(Select("data", Var("t"))),
        variant_names_with_qty: Map(
          Var("flattened"),
          Lambda(
            "line_item",
            Let(
              {},
              {
                name: Select("name", Var("line_item")),
                qty: Select("quantity", Var("line_item")),
              }
            )
          )
        ),
        variant_names: Map(
          Var("variant_names_with_qty"),
          Lambda("line_item", Select("name", Var("line_item")))
        ),
        distinct_variant_names: Distinct(Var("variant_names")),
        variant_names_with_count: Map(
          Var("distinct_variant_names"),
          Lambda(
            "distinct_name",
            Let(
              {},
              {
                name: Var("distinct_name"),
                count: Reduce(
                  Lambda(
                    ["acc", "value"],
                    Let(
                      {
                        qty: Select("qty", Var("value")),
                      },
                      Add(Var("acc"), Var("qty"))
                    )
                  ),
                  0,
                  Filter(
                    Var("variant_names_with_qty"),
                    Lambda(
                      "v",
                      Equals(Var("distinct_name"), Select("name", Var("v")))
                    )
                  )
                ),
              }
            )
          )
        ),
      },
      Var("variant_names_with_count")
    )
  );
};
