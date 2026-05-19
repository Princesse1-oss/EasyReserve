from django.contrib import admin
from .models import Reservation

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['client', 'trajet', 'statut', 'date_reservation']
    list_filter = ['statut']
    search_fields = ['client__username', 'trajet__ville_depart']


