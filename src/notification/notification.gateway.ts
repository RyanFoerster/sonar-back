import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  afterInit() {
    this.logger.log('Serveur WebSocket initialisé');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} a rejoint la room: ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
    this.logger.log(`Client ${client.id} a quitté la room: ${room}`);
    return { event: 'left', room };
  }
}
