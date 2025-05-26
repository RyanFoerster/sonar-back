import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { JwtAuthGuard } from '@/guards/auth.guard';

// Interface pour les informations de frappe
interface UserTypingInfo {
  userId: number;
  userName: string;
  eventId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'event-chat',
})
export class EventChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventChatGateway.name);

  constructor(private readonly eventService: EventService) {}

  afterInit() {
    this.logger.log('Event Chat WebSocket Gateway initialisé');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté au chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté du chat: ${client.id}`);
  }

  @SubscribeMessage('joinEventRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() eventId: string,
  ) {
    const room = `event-${eventId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} a rejoint la room du chat: ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leaveEventRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() eventId: string,
  ) {
    const room = `event-${eventId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} a quitté la room du chat: ${room}`);
    return { event: 'left', room };
  }

  @SubscribeMessage('chatMessage')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateChatMessageDto,
  ) {
    try {
      // Enregistrer le message dans la base de données
      const message = await this.eventService.createChatMessage(data);

      // Émettre le message à tous les membres de la room
      const room = `event-${data.eventId}`;
      this.server.to(room).emit('newChatMessage', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(
        `Erreur lors du traitement du message: ${error.message}`,
      );
      client.emit('error', { message: "Erreur lors de l'envoi du message" });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getChatHistory')
  async handleGetChatHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string; page?: number; limit?: number },
  ) {
    try {
      const { eventId, page = 1, limit = 10 } = data;
      const result = await this.eventService.getChatMessages(
        eventId,
        page,
        limit,
      );
      return { success: true, ...result };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération de l'historique du chat: ${error.message}`,
      );
      client.emit('error', {
        message: "Erreur lors de la récupération de l'historique du chat",
      });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('userTyping')
  handleUserTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UserTypingInfo,
  ) {
    try {
      const room = `event-${data.eventId}`;
      // Diffuser l'information de frappe à tous les utilisateurs dans la room sauf l'émetteur
      client.to(room).emit('userTyping', data);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la diffusion de l'indicateur de frappe: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('userStoppedTyping')
  handleUserStoppedTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; eventId: string },
  ) {
    try {
      const room = `event-${data.eventId}`;
      // Diffuser l'arrêt de frappe à tous les utilisateurs dans la room sauf l'émetteur
      client.to(room).emit('userStoppedTyping', data);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la diffusion de l'arrêt de frappe: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }
}
