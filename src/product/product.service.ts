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
    Logger.debug(
      `Creating product with ${JSON.stringify(createProductDto, null, 2)}`,
    );

    // Créer une nouvelle instance de produit
    const product = new Product();

    // Copier les propriétés de base
    product.description = createProductDto.description;
    product.price = createProductDto.price;
    product.quantity = createProductDto.quantity;
    product.vat = createProductDto.vat;

    // Utiliser les valeurs calculées si elles sont fournies, sinon les calculer
    if (
      createProductDto.price_htva !== undefined &&
      createProductDto.tva_amount !== undefined &&
      createProductDto.total !== undefined
    ) {
      product.price_htva = createProductDto.price_htva;
      product.tva_amount = createProductDto.tva_amount;
      product.total = createProductDto.total;
    } else {
      // Calcul par défaut (TVA non incluse)
      product.price_htva = product.price * product.quantity;
      product.tva_amount = product.price_htva * product.vat;
      product.total = product.price_htva + product.tva_amount;
    }

    return this.productRepository.save(product);
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

    // Calculer les montants en fonction de tvaIncluded
    if (tvaIncluded) {
      // Si TVA incluse, on recalcule les montants HTVA
      const priceWithVAT = updatedProduct.price * updatedProduct.quantity;
      const vatRate = updatedProduct.vat;
      const priceHTVA = priceWithVAT / (1 + vatRate);
      const tvaAmount = priceWithVAT - priceHTVA;

      updatedProduct.price_htva = priceHTVA;
      updatedProduct.tva_amount = tvaAmount;
      updatedProduct.total = priceWithVAT;
    } else {
      // Si TVA non incluse, on recalcule les montants avec TVA
      const priceHTVA = updatedProduct.price * updatedProduct.quantity;
      const tvaAmount = priceHTVA * updatedProduct.vat;
      const total = priceHTVA + tvaAmount;

      updatedProduct.price_htva = priceHTVA;
      updatedProduct.tva_amount = tvaAmount;
      updatedProduct.total = total;
    }

    Logger.debug(
      `Product after calculations ${id} with ${JSON.stringify(updatedProduct, null, 2)}`,
    );

    // Sauvegarder les modifications dans la base de données
    if (updateProductDto.shouldSave !== false) {
      return this.productRepository.save(updatedProduct);
    }

    // Retourner l'objet mis à jour sans le sauvegarder si shouldSave est false
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
