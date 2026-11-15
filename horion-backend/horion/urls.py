from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from accounts import views as auth
from nasa_private import views as nasa
from science.views import RepositoryViewSet, ContributionViewSet
from opportunities.views import PublicCallViewSet, ApplicationViewSet, status, subscribe
from core.views import overview

router = DefaultRouter()
router.register("nasa/astronautas", nasa.AstronautViewSet, basename="astronauts")
router.register("nasa/misiones", nasa.MissionViewSet, basename="missions")
router.register("nasa/lotes", nasa.BatchViewSet, basename="batches")
router.register("nasa/investigaciones", nasa.ResearchViewSet, basename="research")
router.register("nasa/moderacion", nasa.ModerationViewSet, basename="moderation")
router.register("nasa/convocatorias", nasa.AdminCallViewSet, basename="admin-calls")
router.register(
    "nasa/postulaciones", nasa.AdminApplicationViewSet, basename="admin-applications"
)
router.register("science/repositorios", RepositoryViewSet, basename="repositories")
router.register("science/aportaciones", ContributionViewSet, basename="contributions")
router.register("opportunities/convocatorias", PublicCallViewSet, basename="calls")
router.register(
    "opportunities/postulaciones", ApplicationViewSet, basename="applications"
)
urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/health/",
        lambda request: JsonResponse({"status": "ok", "project": "Horion"}),
    ),
    path("api/v1/overview/", overview),
    path("api/v1/auth/register/", auth.register),
    path("api/v1/auth/login/", auth.login),
    path("api/v1/auth/me/", auth.me),
    path("api/v1/auth/refresh/", auth.refresh),
    path("api/v1/auth/logout/", auth.logout),
    path("api/v1/sync/ingest/", nasa.ingest_view),
    path("api/v1/sync/updates/", nasa.edge_updates),
    path("api/v1/nasa/telemetry/", nasa.telemetry),
    path("api/v1/nasa/lotes-pendientes/", nasa.pending_batches),
    path("api/v1/nasa/portal-convocatorias/toggle/", nasa.toggle_portal),
    path("api/v1/opportunities/status/", status),
    path("api/v1/opportunities/subscribe/", subscribe),
    path(
        "api/v1/opportunities/postular/", ApplicationViewSet.as_view({"post": "create"})
    ),
    path("api/v1/", include(router.urls)),
]
admin.site.site_header = "Horion · Administración"
admin.site.site_title = "Horion Admin"
admin.site.index_title = "Edición de datos y configuración"
