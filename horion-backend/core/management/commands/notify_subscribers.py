from django.core.management.base import BaseCommand, CommandError
from django.core.mail import send_mail
from django.conf import settings
from opportunities.models import PortalConfig, Subscription


class Command(BaseCommand):
    help = (
        "Envía un aviso a cada suscriptor (console por defecto; SMTP al configurarlo)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--url", required=True, help="URL pública del tablero de convocatorias."
        )
        parser.add_argument(
            "--send",
            action="store_true",
            help="Enviar; sin esta opción solo cuenta destinatarios.",
        )

    def handle(self, *args, **options):
        if not PortalConfig.current().portal_habilitado:
            raise CommandError(
                "El portal está cerrado; no se enviarán avisos de apertura."
            )
        subscribers = Subscription.objects.all()
        if not options["send"]:
            self.stdout.write(
                f"{subscribers.count()} destinatarios. Añade --send para ejecutar el envío."
            )
            return
        for subscription in subscribers.iterator():
            send_mail(
                "Horion: nuevas ventanas de colaboración",
                f'El portal de convocatorias está abierto. Consulta las oportunidades: {options["url"]}',
                settings.DEFAULT_FROM_EMAIL,
                [subscription.email],
                fail_silently=False,
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Avisos enviados mediante el backend de correo configurado."
            )
        )
