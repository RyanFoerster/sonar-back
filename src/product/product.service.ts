import { Injectable, Logger } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createProductDto: CreateProductDto) {
    createProductDto.total = await this.setTotal(createProductDto);
    Logger.debug(
      `Creating product with ${JSON.stringify(createProductDto, null, 2)}`,
    );
    let product = this.productRepository.create(createProductDto);

    product.price_htva = product.price * product.quantity;
    product.tva_amount = product.price_htva * product.vat;

    return await this.productRepository.save(product);
  }

  findAll() {
    return this.productRepository.find();
  }

  async findOne(id: number) {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['quote'],
    });
  }

  // async update(id: number, updateProductDto: UpdateProductDto) {
  //   updateProductDto.total = await this.setTotal(updateProductDto);
  //   return this.productRepository.update(id, updateProductDto);
  // }
  async updateProduct(
    id: number,
    updateProductDto: UpdateProductDto,
    tvaIncluded: boolean,
  ) {
    Logger.debug(
      `Updating product ${id} with ${JSON.stringify(updateProductDto, null, 2)}`,
    );

    // Récupérer le produit existant
    const existingProduct = await this.productRepository.findOne({
      where: { id },
    });

    // Créer une copie de l'objet pour ne pas modifier directement l'entité
    const updatedProduct = { ...existingProduct };

    // Mettre à jour uniquement les champs modifiés
    Object.assign(updatedProduct, updateProductDto);

    Logger.debug(
      `Product before calculations ${id} with ${JSON.stringify(updatedProduct, null, 2)}`,
    );

    // Garder les valeurs originales
    updatedProduct.price_htva = existingProduct.price_htva;
    updatedProduct.tva_amount = existingProduct.tva_amount;
    updatedProduct.total = existingProduct.total;
    updatedProduct.vat = updateProductDto.vat;

    Logger.debug(
      `Product after calculations ${id} with ${JSON.stringify(updatedProduct, null, 2)}`,
    );

    // Retourner l'objet mis à jour sans le sauvegarder
    return updatedProduct;
  }

  async saveProduct(product: Product) {
    return this.productRepository.save(product);
  }

  remove(id: number) {
    return this.productRepository.delete(id);
  }

  async setTotal(product: Product | UpdateProductDto) {
    Logger.debug(
      `Setting total for product with ${JSON.stringify(product, null, 2)}`,
    );
    let productVat = product.price * product.vat;
    let productTotal = +product.price + +productVat;
    return productTotal * product.quantity;
  }
}
