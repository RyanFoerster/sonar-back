import { Injectable } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "./entities/product.entity";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createProductDto: CreateProductDto) {
    createProductDto.total = await this.setTotal(createProductDto);

    let product = this.productRepository.create(createProductDto);

    product.price_htva = product.price * product.quantity
    product.tva_amount = product.price_htva * product.vat

    return await this.productRepository.save(product);
  }

  findAll() {
    return this.productRepository.find();
  }

  async findOne(id: number) {
    return await this.productRepository.findOneBy({ id });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    updateProductDto.total = await this.setTotal(updateProductDto);
    return this.productRepository.update(id, updateProductDto);
  }

  remove(id: number) {
    return this.productRepository.delete(id);
  }

  async setTotal(product: Product | UpdateProductDto) {
    let productVat = product.price * product.vat;
    let productTotal = (+product.price) + (+productVat);

    return productTotal * product.quantity;
  }
}
