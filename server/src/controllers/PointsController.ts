import { Request, Response } from "express";
import knex from "../database/connections";

class PointsController {
  async index(request: Request, response: Response) {
    const { city, uf, items } = request.query;

    const parsedItems = String(items)
      .split(",")
      .map((item) => Number(item.trim()));

    const points = await knex("points")
      .join("point_items", "points.id", "=", "point_items.point_id")
      .whereIn("point_items.item_id", parsedItems)
      .where("city", String(city))
      .where("uf", String(uf))
      .distinct()
      .select("points.*");

      const serializedPoints = points.map((item) => {
        return {
          ...points,
          image_url: `http://10.0.0.107:3333/uploads/${item.image}`,
        };
      });

    return response.json( serializedPoints );
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;

    let point = await knex("points").where("id", id).first();

    if (!point) {
      return response.status(400).json({ message: "Point not found." });
    }

    const serializedPoint = {
        ...point,
        image_url: `http://10.0.0.107:3333/uploads/${point.image}`,
      };
    

    const items = await knex("items")
      .join("point_items", "items.id", "=", "point_items.item_id")
      .where("point_items.point_id", id)
      .select("items.title");

    return response.json({point: serializedPoint,items});
  }

  async create(request: Request, response: Response) {
    const trx = await knex.transaction();
    try {
      const {
        name,
        email,
        whatssap,
        latitude,
        longitude,
        city,
        uf,
        items,
      } = request.body;

      const point = {
        image: request.file.filename,
        name,
        email,
        whatssap,
        latitude,
        longitude,
        city,
        uf,
      };

      const insertedIds = await trx("points").insert(point);

      const point_id = insertedIds[0];

      const pointItems = items
        .split(',')
        .map((item: string) => Number(item.trim()))
        .map((item_id: number) => {
        return {
          item_id,
          point_id,
        };
      });

      await trx("point_items").insert(pointItems);

      await trx.commit();

      return response.json({ id: point_id, ...point });
    } catch (error) {
      console.log({ error: error });
      await trx.rollback();
    }
  }
}

export default PointsController;
