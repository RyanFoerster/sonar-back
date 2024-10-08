import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
  //   Logger.debug(`updateProduct id: ${id}`);
  //   // return this.productService.update(+id, updateProductDto);
  // }

  @Put('update/:id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Query('tvaIncluded') tvaIncluded: boolean,
  ) {
    Logger.debug(`updateProduct id: ${id}`);
    return this.productService.updateProduct(
      +id,
      updateProductDto,
      tvaIncluded,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
