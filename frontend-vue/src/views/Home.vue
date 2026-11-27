<script setup>
import Header from '../components/Header.vue'
import Hero from '../components/Hero.vue'
import RevenueChart from '../components/RevenueChart.vue'
import Metrics from '../components/Metrics.vue'
import Architecture from '../components/Architecture.vue'
import CTA from '../components/CTA.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
  <div class="min-h-screen fundo-home text-cti-grafite-home flex flex-col font-['Inter',sans-serif]">
    
    <!-- Header -->
    <Header />

    <!-- Conteúdo principal -->
    <main class="flex-1">
      <Hero />
      <RevenueChart />
      <Metrics />
      <Architecture />
      <CTA />
    </main>

    <!-- Footer -->
    <Footer />

  </div>
</template>